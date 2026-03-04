// ── Multiverse Tauri Backend ──
// Handles Ollama proxy (bypass browser CORS), node identity, and local services.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;

mod identity;

// ── Ollama Proxy ──
// Routes LLM requests through Rust to bypass browser CORS/COEP restrictions.

#[derive(Debug, Deserialize)]
struct OllamaMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    host: Option<String>,
}

#[derive(Debug, Serialize)]
struct OllamaChatResponse {
    content: String,
    model: String,
    done: bool,
}

#[tauri::command]
async fn ollama_chat(request: OllamaChatRequest) -> Result<OllamaChatResponse, String> {
    let host = request.host.unwrap_or_else(|| "http://localhost:11434".to_string());
    let url = format!("{}/api/chat", host);

    let body = serde_json::json!({
        "model": request.model,
        "messages": request.messages.iter().map(|m| {
            serde_json::json!({
                "role": m.role,
                "content": m.content
            })
        }).collect::<Vec<_>>(),
        "stream": false
    });

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama at {}: {}", host, e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_default();
        return Err(format!("Ollama error {}: {}", status, error_body));
    }

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    let content = data["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(OllamaChatResponse {
        content,
        model: request.model,
        done: true,
    })
}

#[tauri::command]
async fn ollama_list_models(host: Option<String>) -> Result<Vec<String>, String> {
    let host = host.unwrap_or_else(|| "http://localhost:11434".to_string());
    let url = format!("{}/api/tags", host);

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse model list: {}", e))?;

    let models = data["models"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|m| m["name"].as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    Ok(models)
}

// ── Node Identity (Phase 3 foundation) ──

#[tauri::command]
fn get_node_id(state: tauri::State<'_, Mutex<identity::NodeIdentity>>) -> Result<String, String> {
    let identity = state.lock().map_err(|e| e.to_string())?;
    Ok(identity.public_key_hex())
}

#[tauri::command]
fn sign_message(
    data: String,
    state: tauri::State<'_, Mutex<identity::NodeIdentity>>,
) -> Result<String, String> {
    let identity = state.lock().map_err(|e| e.to_string())?;
    Ok(identity.sign(data.as_bytes()))
}

#[tauri::command]
fn verify_signature(public_key: String, data: String, signature: String) -> Result<bool, String> {
    identity::NodeIdentity::verify_external(&public_key, data.as_bytes(), &signature)
        .map_err(|e| e.to_string())
}

// ── App Entry ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let node_identity = identity::NodeIdentity::load_or_create()
        .expect("Failed to initialize node identity");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(node_identity))
        .invoke_handler(tauri::generate_handler![
            ollama_chat,
            ollama_list_models,
            get_node_id,
            sign_message,
            verify_signature,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
