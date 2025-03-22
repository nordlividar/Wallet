// Check if ethers is loaded
if (typeof ethers === "undefined") {
    console.error("Ethers.js not loaded. Please ensure the script is included.");
    document.getElementById("status").innerText = "Error: Ethers.js not loaded";
    throw new Error("Ethers.js not loaded");
  }
  
  let provider, signer, contract, totalSpent = 0, userAddress, transactions = [];
  const contractAddress = "0x53911907277be8f6E6B2d3D63A5796410EfA5A0";
  const abi = [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "event PulseEvent(address sender, uint256 amount, uint256 pulseCount)"
  ];
  const SEPOLIA_CHAIN_ID = "11155111"; // Sepolia chain ID (decimal)
  
  // Custom provider to disable ENS
  class NoEnsProvider extends ethers.BrowserProvider {
    constructor(ethereumProvider) {
      super(ethereumProvider, {
        chainId: parseInt(SEPOLIA_CHAIN_ID),
        name: "sepolia",
        ensAddress: null // Disable ENS
      });
    }
  
    // Override resolveName to skip ENS
    async resolveName(name) {
      console.debug("resolveName called with:", name);
      if (ethers.isAddress(name)) {
        console.debug("Input is a valid address, returning as-is:", name);
        return name; // Return the address as-is
      }
      console.debug("Input is not a valid address, rejecting as ENS is not supported:", name);
      throw new Error(`ENS not supported on this network. Please use a raw address instead of: ${name}`);
    }
  
    // Override lookupAddress to skip ENS
    async lookupAddress(address) {
      console.debug("lookupAddress called with:", address);
      return null; // Skip ENS reverse lookup
    }
  }
  
  // Show loading spinner
  function showLoading(show) {
    document.getElementById("loadingSpinner").style.display = show ? "block" : "none";
  }
  
  // Add transaction to history
  function addTransaction(to, amount) {
    transactions.push({ to, amount });
    if (transactions.length > 5) transactions.shift(); // Keep only the last 5 transactions
    const txList = document.getElementById("txList");
    txList.innerHTML = "";
    transactions.forEach(tx => {
      const li = document.createElement("li");
      li.innerText = `Sent ${tx.amount} WPU to ${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`;
      txList.appendChild(li);
    });
  }
  
  // Connect to the selected wallet
  async function connectWallet() {
    try {
      showLoading(true);
      const walletType = document.getElementById("walletSelect").value;
      let ethereumProvider;
  
      // Handle multiple providers if available
      const providers = window.ethereum?.providers || (window.ethereum ? [window.ethereum] : []);
  
      if (walletType === "metamask") {
        ethereumProvider = providers.find(p => p.isMetaMask && !p.isCoinbaseWallet) || window.ethereum;
        if (!ethereumProvider || !ethereumProvider.isMetaMask || ethereumProvider.isCoinbaseWallet) {
          throw new Error("MetaMask not detected. Please ensure MetaMask is installed and active.");
        }
      } else if (walletType === "coinbase") {
        ethereumProvider = providers.find(p => p.isCoinbaseWallet) || window.ethereum;
        if (!ethereumProvider || !ethereumProvider.isCoinbaseWallet) {
          throw new Error("Coinbase Wallet not detected.");
        }
      } else if (walletType === "brave") {
        ethereumProvider = providers.find(p => p.isBraveWallet) || window.ethereum;
        if (!ethereumProvider || !ethereumProvider.isBraveWallet) {
          throw new Error("Brave Wallet not detected.");
        }
      } else {
        ethereumProvider = window.ethereum;
        if (!ethereumProvider) {
          throw new Error("No injected wallet detected. Please install a wallet like MetaMask.");
        }
      }
  
      // Initialize custom provider
      provider = new NoEnsProvider(ethereumProvider);
  
      // Check network with a fallback
      let chainId;
      try {
        const network = await provider.getNetwork();
        chainId = network.chainId.toString();
      } catch (error) {
        console.warn("eth_chainId not supported, using fallback...");
        chainId = await ethereumProvider.request({ method: "net_version" });
      }
  
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          await ethereumProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${parseInt(SEPOLIA_CHAIN_ID).toString(16)}` }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await ethereumProvider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${parseInt(SEPOLIA_CHAIN_ID).toString(16)}`,
                  chainName: "Sepolia Test Network",
                  rpcUrls: ["https://sepolia.infura.io/v3/"],
                  nativeCurrency: {
                    name: "Sepolia ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
              ],
            });
          } else {
            throw new Error("Please switch to the Sepolia network in your wallet.");
          }
        }
      }
  
      // Connect wallet
      await ethereumProvider.request({ method: "eth_requestAccounts" });
      signer = await provider.getSigner();
  
      // Validate contract address
      if (!ethers.isAddress(contractAddress)) {
        throw new Error("Invalid contract address: " + contractAddress);
      }
      console.debug("Initializing contract with address:", contractAddress);
      contract = new ethers.Contract(contractAddress, abi, signer);
  
      // Cache the user address
      userAddress = (await ethereumProvider.request({ method: "eth_accounts" }))[0];
      console.debug("User address:", userAddress);
  
      // Update UI
      document.getElementById("status").innerText = "Connected";
      document.getElementById("connectButton").disabled = true;
      document.getElementById("userAddress").style.display = "block";
      document.getElementById("addressDisplay").innerText = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
      await updateBalance();
  
      // Listen for PulseEvent to track spending
      contract.on("PulseEvent", (sender, amount, pulseCount) => {
        console.debug("PulseEvent received:", { sender, amount, pulseCount });
        if (sender.toLowerCase() === userAddress.toLowerCase()) {
          const amountInEther = Number(amount) / 1e18;
          totalSpent += amountInEther;
          checkSpending(totalSpent);
          callAI(totalSpent);
        }
      });
  
      // Listen for account/network changes
      ethereumProvider.on("accountsChanged", () => {
        window.location.reload();
      });
      ethereumProvider.on("chainChanged", () => {
        window.location.reload();
      });
    } catch (error) {
      console.error("Connection failed:", error.message);
      document.getElementById("status").innerText = `Error: ${error.message}`;
    } finally {
      showLoading(false);
    }
  }
  
  // Update balance on UI
  async function updateBalance() {
    try {
      showLoading(true);
      if (!signer || !contract || !userAddress) {
        throw new Error("Wallet not connected");
      }
      console.debug("Fetching balance for:", userAddress);
      const balance = await contract.balanceOf(userAddress);
      const balanceInEther = Number(balance) / 1e18;
      document.getElementById("balance").innerText = balanceInEther.toString();
    } catch (error) {
      console.error("Balance update failed:", error.message);
      document.getElementById("status").innerText = `Error: ${error.message}`;
    } finally {
      showLoading(false);
    }
  }
  
  // Send WPU
  async function sendWPU() {
    try {
      showLoading(true);
      if (!contract) {
        throw new Error("Wallet not connected");
      }
      const to = document.getElementById("address").value;
      const amountInput = document.getElementById("amount").value;
      if (!ethers.isAddress(to)) {
        throw new Error("Invalid recipient address: " + to);
      }
      if (!amountInput || Number(amountInput) <= 0) {
        throw new Error("Amount must be a positive number");
      }
      const amount = ethers.parseEther(amountInput);
      const balance = await contract.balanceOf(userAddress);
      if (balance < amount) {
        throw new Error("Insufficient WPU balance");
      }
      const tx = await contract.transfer(to, amount);
      await tx.wait();
      const amountInEther = Number(amount) / 1e18;
      console.log(`Sent ${amountInEther} WPU to ${to}`);
      addTransaction(to, amountInEther);
      await updateBalance();
    } catch (error) {
      console.error("Send failed:", error.message);
      document.getElementById("status").innerText = `Error: ${error.message}`;
    } finally {
      showLoading(false);
    }
  }
  
  // Simple AI: Check spending and suggest
  function checkSpending(spent) {
    if (spent > 10) {
      console.log(`Alert: You've spent ${spent} WPU—consider slowing down!`);
    } else {
      console.log(`Spending: ${spent} WPU—looking good!`);
    }
  }
  
  // Call AI server
  async function callAI(totalSpent) {
    try {
      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalSpent })
      });
      const data = await response.json();
      document.getElementById("aiSuggestion").innerText = `AI Suggestion: ${data.suggestion}`;
    } catch (error) {
      console.error("AI call failed:", error.message);
      document.getElementById("aiSuggestion").innerText = "AI Suggestion: Unable to fetch suggestion";
    }
  }
  
  // Expose functions to HTML
  window.connectWallet = connectWallet;
  window.sendWPU = sendWPU;