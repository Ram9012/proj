# Project title and discription
Build on Algorand
Description:
Build a system where academic achievements (certificates, awards, course completions) are issued as NFTs on Algorand. Students can share verifiable credentials with employers or other institutions without relying on the issuing institution to respond to verification requests.

# Problem Statement Selected
Project 12: Decentralized Academic Credential Verifier

Traditional credential verification:

Requires manual verification
Is time-consuming
Is prone to certificate fraud
Depends heavily on university response

Our solution enables:

Instant verification
Tamper-proof document storage
Public on-chain validation
Reduced institutional overhead

# Live demo URL
https://credverify.netlify.app/

# LinkedIn demo video URL
https://www.linkedin.com/posts/vishnu-v-53488b28a_rift-pwioi-ugcPost-7430427473445601281-B2Jb?utm_source=share&utm_medium=member_desktop&rcm=ACoAAEZA1TgBSyj_3tp-ItaxtSNaclzWVK1eXv8

# Live Deployment Info
Netlify : https://credverify.netlify.app/

 **App ID (Testnet)**: `755802996`

# Architecture Overview 

```
                ┌────────────────────────┐
                │        Institute       │
                └──────────┬─────────────┘
                           │
                           ▼
                ┌────────────────────────┐
                │   React Frontend       │
                │ (Issuer Dashboard)     │
                └──────────┬─────────────┘
                           │ API Call
                           ▼
                ┌────────────────────────┐
                │     Flask Backend      │
                │  - Hashing Logic       │
                │  - NFT Minting         │
                │  - Verification API    │
                └──────────┬─────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │     IPFS     │  │  Algorand    │  │   SQLite     │
 │ (Certificate │  │  Testnet     │  │  Metadata DB │
 │  Storage)    │  │ (ARC-3 NFT)  │  │              │
 └──────────────┘  └──────────────┘  └──────────────┘
                           │
                           ▼
                ┌────────────────────────┐
                │   Public Verification  │
                │   (Recruiter Access)   │
                └────────────────────────┘
```

### Component Breakdown

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Frontend** | React | Issuer dashboard UI |
| **Backend** | Flask | Hashing, NFT minting, verification API |
| **Storage** | IPFS | Decentralized certificate file storage |
| **Blockchain** | Algorand Testnet | ARC-3 NFT minting & on-chain proof |
| **Database** | SQLite | Certificate metadata indexing |
| **Access** | Public Verify Page | Recruiter/employer credential lookup |
```
## Tech Stack

Smart Contract Language — Python using Algorand Python (algopy), ARC4 spec
Development Tooling — AlgoKit, Poetry
Frontend Framework — React (Vite)
Blockchain Interaction (Frontend) — algosdk for JavaScript


---------------------------------------------------------------------

## Installation & Setup Instructions

### Prerequisites

- Node.js (v18+)
- Python (v3.12+)
- Docker *(for local Algorand network via AlgoKit LocalNet)*
- [AlgoKit CLI](https://github.com/algorandfoundation/algokit-cli)

---------------------------------------------------------------------

### 1. Smart Contract Deployment

1. Navigate to the contract project folder:

   cd projects/credential-verifier
```

2. Install dependencies:
```bash
   poetry install
```

3. Start the local Algorand network:
```bash
   algokit localnet start
```

4. Deploy the smart contract:
```bash
   algokit deploy
```
2. Install Python dependencies via Poetry:
   ```bash
   poetry install
   ```
3. Compile and deploy the contract using AlgoKit (requires a funded Testnet deployer account):
   ```bash
   algokit project deploy testnet
   ```
4. Note the output **App ID** once deployed.

### 2. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables:
   Copy `.env.example` to `.env` and update the `VITE_APP_ID`:
   ```env
   VITE_APP_ID=1001 # Replace with your deployed App ID
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
# Usage guide with screenshots



## Known Limitations

- **Wallet Connection**: Currently utilizes a local, temporary generated Testnet account in memory for simplicity. In a production environment, this should integrate with Pera Wallet or Defly for proper transaction signing and Key Management.
- **Storage Strategy**: The certificate metadata (like PDF files) relies on external IPFS links which are only as permanent as the IPFS pinning service used.
- **Revocation Model**: Once revoked, an asset is clawed back. It cannot be easily "un-revoked" and transferred back without issuing a brand new ASA.

# Team members and roles

Vishnu Vijay - Frontend & Research 
- Designed and implemented React (Vite) UI
- Developed role-based dashboards (Institute, Student, Recruiter)
- Conducted research on decentralized identity and credential verification models

Ramansh Tomar - Blockchain & Smart Contracts
- Algorand NFT minting
- ARC-3 metadata
- Testnet deployment
- Smart contract logic

Manasvi Sharad Mali — Frontend & Verification Logic
- QR-based verification
- Public verification page
- React architecture
- system documentation and architectural planning

Sri Aishwarya - Backend & IPFS
- Certificate upload
- Generated and managed IPFS CIDs for certification
- Integrated IPFS for decentralized document storage

