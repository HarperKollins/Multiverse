# Multiverse Agent Communication Protocol

## Overview

This document defines the protocol for agent-to-agent communication in the Multiverse mesh network. Every message on the mesh follows this protocol.

## Message Envelope

Every mesh message is wrapped in a standard envelope:

```json
{
  "type": "QUERY | ANSWER | SHARE | ANNOUNCE | PING | PONG | TRUST_VOTE",
  "fromPeerId": "hex-encoded-ed25519-public-key",
  "fromPeerName": "Human-readable node name",
  "timestamp": 1709600000000,
  "signature": "hex-encoded-ed25519-signature",
  "payload": { ... }
}
```

## Message Types

### ANNOUNCE
Sent when a node joins the network or periodically to maintain presence.

```json
{
  "type": "ANNOUNCE",
  "payload": {
    "capabilities": ["search", "llm", "knowledge"],
    "knowledgeCount": 42,
    "publicKey": "hex-encoded-ed25519-public-key"
  }
}
```

### QUERY (formerly ASK)
Broadcast a question to the mesh.

```json
{
  "type": "QUERY",
  "payload": {
    "queryId": "unique-query-id",
    "question": "What is libp2p?",
    "requiredCapabilities": ["knowledge"]
  }
}
```

### ANSWER
Response to a QUERY.

```json
{
  "type": "ANSWER",
  "payload": {
    "queryId": "matching-query-id",
    "answer": "libp2p is a modular networking stack...",
    "confidence": 0.85,
    "sources": ["https://docs.libp2p.io"]
  }
}
```

### SHARE
Proactively share knowledge entries with peers.

```json
{
  "type": "SHARE",
  "payload": {
    "entries": [
      {
        "title": "...",
        "content": "...",
        "sourceUrl": "...",
        "trustScore": 0.8
      }
    ]
  }
}
```

### TRUST_VOTE
Vote on the trustworthiness of a peer's knowledge.

```json
{
  "type": "TRUST_VOTE",
  "payload": {
    "targetPeerId": "peer-being-voted-on",
    "knowledgeId": "specific-knowledge-entry",
    "vote": "confirm | dispute",
    "reason": "Optional reason"
  }
}
```

## Trust Scoring

- New peers start at trust 0.5
- Correct answers increase trust by 0.05
- TRUST_VOTE confirmations increase by 0.02
- TRUST_VOTE disputes decrease by 0.1
- Trust decays toward 0.5 over time (regression to mean)
- Trust range: [0.0, 1.0]

## Anti-Poisoning Measures

1. **Confirmation Count**: Knowledge is only promoted to high trust after N independent sources confirm it
2. **Source Tracking**: Every knowledge entry tracks which peer provided it
3. **Signature Verification**: All messages are signed with Ed25519 — no impersonation
4. **Rate Limiting**: Max 10 SHARE messages per minute per peer
