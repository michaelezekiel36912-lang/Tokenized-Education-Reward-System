# 📚 Tokenized Education Reward System

Welcome to an innovative Web3 platform that motivates students worldwide by rewarding them with tokens for completing verified educational modules! This project addresses real-world challenges in education, such as lack of motivation, credential fraud, and unequal access to learning incentives, by leveraging the Stacks blockchain for transparent, verifiable achievements and tokenized rewards.

## ✨ Features

🔑 Tokenized rewards for module completions  
✅ Verifiable certificates as NFTs for tamper-proof credentials  
📊 Student progress tracking with on-chain profiles  
🏆 Governance for community-driven module approvals  
💰 Staking mechanism to unlock premium modules  
🔍 Oracle integration for automated completion verification  
🚫 Anti-fraud measures to prevent duplicate claims  
🌍 Global accessibility for decentralized education

## 🛠 How It Works

This system uses 8 smart contracts written in Clarity on the Stacks blockchain to create a secure, decentralized education incentive platform. Here's a breakdown:

### Core Smart Contracts
1. **RewardToken.clar**: A SIP-10 fungible token contract for issuing and managing reward tokens (e.g., EDU tokens). Handles minting, burning, and transfers.
2. **ModuleRegistry.clar**: Registers educational modules with details like title, description, difficulty, and required prerequisites. Ensures modules are unique and approved.
3. **StudentProfile.clar**: Manages student accounts, tracking completed modules, total rewards earned, and progress levels.
4. **CompletionVerifier.clar**: Verifies module completions via oracle inputs or admin signatures, triggering rewards and NFT minting.
5. **CertificateNFT.clar**: A SIP-09 non-fungible token contract for issuing unique certificates as NFTs upon module completion, storing metadata like completion date and score.
6. **RewardDistributor.clar**: Distributes tokens from a reward pool based on verified completions, with adjustable reward amounts per module.
7. **Governance.clar**: Allows token holders to vote on new module additions, reward rates, and system updates for community control.
8. **StakingPool.clar**: Enables students to stake EDU tokens to access advanced or premium modules, with unstaking after completion.

**For Students**  
- Create a profile by calling the `register-student` function in StudentProfile.clar.  
- Browse available modules via ModuleRegistry.clar.  
- For premium modules, stake tokens using StakingPool.clar.  
- Complete a module off-chain (e.g., via integrated apps or platforms).  
- Submit proof to CompletionVerifier.clar (e.g., via an oracle or signed transaction).  
- Upon verification, receive EDU tokens from RewardDistributor.clar and an NFT certificate from CertificateNFT.clar.  
- Track your progress and rewards in StudentProfile.clar.  

**For Educators/Module Creators**  
- Submit a new module proposal to ModuleRegistry.clar with details and a unique hash.  
- Use Governance.clar to propose and vote on module approvals if community-driven.  
- Set reward amounts and prerequisites in the registry.  

**For Verifiers (e.g., Employers)**  
- Query StudentProfile.clar to view a student's completed modules and total rewards.  
- Use CertificateNFT.clar to verify ownership and details of specific certificates.  
- Check CompletionVerifier.clar for timestamped proofs of completion.  

That's it! Students get motivated with real rewards, credentials are fraud-proof, and the system evolves through decentralized governance. Start building decentralized education today!