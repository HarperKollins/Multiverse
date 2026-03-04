// ── Multiverse Node Identity ──
// Ed25519 keypair for persistent node identity across sessions.
// Private key stored locally, public key used as node ID on the mesh.

use ed25519_dalek::{Signer, SigningKey, Verifier, VerifyingKey, Signature};
use rand::rngs::OsRng;

pub struct NodeIdentity {
    signing_key: SigningKey,
}

impl NodeIdentity {
    /// Load existing keypair from app data or generate a new one.
    pub fn load_or_create() -> Result<Self, Box<dyn std::error::Error>> {
        let key_path = Self::key_file_path();

        if key_path.exists() {
            let key_bytes = std::fs::read(&key_path)?;
            if key_bytes.len() == 32 {
                let mut seed = [0u8; 32];
                seed.copy_from_slice(&key_bytes);
                let signing_key = SigningKey::from_bytes(&seed);
                return Ok(Self { signing_key });
            }
        }

        // Generate new keypair
        let signing_key = SigningKey::generate(&mut OsRng);
        
        // Ensure directory exists
        if let Some(parent) = key_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Save private key
        std::fs::write(&key_path, signing_key.to_bytes())?;

        Ok(Self { signing_key })
    }

    /// Get the hex-encoded public key (this is the node's identity on the mesh)
    pub fn public_key_hex(&self) -> String {
        let verifying_key = self.signing_key.verifying_key();
        hex::encode(verifying_key.to_bytes())
    }

    /// Sign a message and return hex-encoded signature
    pub fn sign(&self, message: &[u8]) -> String {
        let signature = self.signing_key.sign(message);
        hex::encode(signature.to_bytes())
    }

    /// Verify a signature from an external peer
    pub fn verify_external(
        public_key_hex: &str,
        message: &[u8],
        signature_hex: &str,
    ) -> Result<bool, String> {
        let pub_bytes = hex::decode(public_key_hex)
            .map_err(|e| format!("Invalid public key hex: {}", e))?;

        if pub_bytes.len() != 32 {
            return Err("Public key must be 32 bytes".to_string());
        }

        let mut key_array = [0u8; 32];
        key_array.copy_from_slice(&pub_bytes);

        let verifying_key = VerifyingKey::from_bytes(&key_array)
            .map_err(|e| format!("Invalid public key: {}", e))?;

        let sig_bytes = hex::decode(signature_hex)
            .map_err(|e| format!("Invalid signature hex: {}", e))?;

        if sig_bytes.len() != 64 {
            return Err("Signature must be 64 bytes".to_string());
        }

        let mut sig_array = [0u8; 64];
        sig_array.copy_from_slice(&sig_bytes);

        let signature = Signature::from_bytes(&sig_array);

        Ok(verifying_key.verify(message, &signature).is_ok())
    }

    fn key_file_path() -> std::path::PathBuf {
        // Store in user's app data directory
        let mut path = dirs_next::data_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."));
        path.push("multiverse");
        path.push("node.key");
        path
    }
}
