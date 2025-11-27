export const CONTRACT_ADDRESS = '0x1A92194B7695268c7e8507D7cFcEd5A99A0B3028';

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "InvalidKMSSignatures",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidLockDuration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidStakeAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LockPeriodActive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoActiveStake",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "StakeAlreadyActive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "StakeAmountTooLarge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WithdrawalAlreadyRequested",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WithdrawalNotRequested",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32[]",
        "name": "handlesList",
        "type": "bytes32[]"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "abiEncodedCleartexts",
        "type": "bytes"
      }
    ],
    "name": "PublicDecryptionVerified",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "lockDuration",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "encryptedAmount",
        "type": "bytes32"
      }
    ],
    "name": "StakeCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "encryptedAmount",
        "type": "bytes32"
      }
    ],
    "name": "WithdrawalFinalized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "encryptedAmount",
        "type": "bytes32"
      }
    ],
    "name": "WithdrawalRequested",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_LOCK_DURATION",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_LOCK_DURATION",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "abiEncodedCleartexts",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "decryptionProof",
        "type": "bytes"
      }
    ],
    "name": "finalizeWithdrawal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getEncryptedAmount",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getStakeSummary",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "encryptedAmount",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "startTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "unlockTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "lockDuration",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "withdrawalRequested",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "exists",
            "type": "bool"
          }
        ],
        "internalType": "struct PrismLock.StakeSummary",
        "name": "summary",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "hasStake",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestWithdrawal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "lockDurationSeconds",
        "type": "uint64"
      }
    ],
    "name": "stake",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;
