import {
  BrowserProvider,
  Contract,
  formatUnits,
  parseUnits,
} from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

// Minimal ERC-20 ABI for the interactions we need
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// Sepolia chain id
const SEPOLIA_CHAIN_ID_DEC = 11155111;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

let provider = null;
let signer = null;
let account = null;

let token = null;
let tokenAddress = null;
let tokenDecimals = null;

// DOM helpers
const $ = (id) => document.getElementById(id);
const setText = (id, text) => ($(`${id}`).textContent = text ?? "—");

function msg(id, text) {
  $(id).textContent = text || "";
}

function requireWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask (or another injected wallet) was not detected.");
  }
}

async function connectWallet() {
  requireWallet();

  provider = new BrowserProvider(window.ethereum);
  await window.ethereum.request({ method: "eth_requestAccounts" });

  signer = await provider.getSigner();
  account = await signer.getAddress();

  const net = await provider.getNetwork();
  setText("network", `${net.name} (chainId=${net.chainId})`);
  setText("account", account);

  msg("walletMsg", "Wallet connected.");
}

async function switchToSepolia() {
  requireWallet();
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
    msg("walletMsg", "Switched network. Re-check token info if needed.");
    // refresh displayed network if already connected
    if (provider) {
      const net = await provider.getNetwork();
      setText("network", `${net.name} (chainId=${net.chainId})`);
    }
  } catch (err) {
    msg(
      "walletMsg",
      `Could not switch network: ${err?.message || String(err)}`
    );
  }
}

function parseAddressInput(value) {
  const v = (value || "").trim();
  if (!v.startsWith("0x") || v.length !== 42) {
    throw new Error("Contract address must look like a 42-char 0x… address.");
  }
  return v;
}

async function loadToken() {
  if (!signer || !account) throw new Error("Connect your wallet first.");

  const net = await provider.getNetwork();
  setText("network", `${net.name} (chainId=${net.chainId})`);

  tokenAddress = parseAddressInput($("tokenAddress").value);

  token = new Contract(tokenAddress, ERC20_ABI, signer);

  const [name, symbol, decimals, supply] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
  ]);

  tokenDecimals = Number(decimals);

  setText("tName", name);
  setText("tSymbol", symbol);
  setText("tDecimals", String(tokenDecimals));
  setText("tSupply", formatUnits(supply, tokenDecimals));

  const bal = await token.balanceOf(account);
  setText("tBalance", formatUnits(bal, tokenDecimals));

  msg("tokenMsg", "Token loaded successfully.");
}

async function refreshBalance() {
  if (!token || !account || tokenDecimals === null) return;
  const bal = await token.balanceOf(account);
  setText("tBalance", formatUnits(bal, tokenDecimals));
}

async function transfer() {
  if (!token) throw new Error("Load the token first.");
  if (tokenDecimals === null) throw new Error("Token decimals unknown.");

  const to = parseAddressInput($("toAddress").value);
  const amtStr = ($("amount").value || "").trim();
  if (!amtStr) throw new Error("Enter an amount.");

  const amount = parseUnits(amtStr, tokenDecimals);

  msg("txMsg", "Sending transaction…");
  const tx = await token.transfer(to, amount);
  msg("txMsg", `Submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  msg("txMsg", `Confirmed in block ${receipt.blockNumber}.`);

  await refreshBalance();
}

async function approve() {
  if (!token) throw new Error("Load the token first.");
  if (tokenDecimals === null) throw new Error("Token decimals unknown.");

  const spender = parseAddressInput($("spender").value);
  const amtStr = ($("allowAmount").value || "").trim();
  if (!amtStr) throw new Error("Enter an allowance amount.");

  const amount = parseUnits(amtStr, tokenDecimals);

  msg("approveMsg", "Sending approval…");
  const tx = await token.approve(spender, amount);
  msg("approveMsg", `Submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  msg("approveMsg", `Confirmed in block ${receipt.blockNumber}.`);
}

// Wire up UI
$("btnConnect").addEventListener("click", async () => {
  msg("walletMsg", "");
  try {
    await connectWallet();
  } catch (e) {
    msg("walletMsg", e?.message || String(e));
  }
});

$("btnSwitchSepolia").addEventListener("click", async () => {
  msg("walletMsg", "");
  await switchToSepolia();
});

$("btnLoadToken").addEventListener("click", async () => {
  msg("tokenMsg", "");
  try {
    await loadToken();
  } catch (e) {
    msg("tokenMsg", e?.message || String(e));
  }
});

$("btnTransfer").addEventListener("click", async () => {
  msg("txMsg", "");
  try {
    await transfer();
  } catch (e) {
    msg("txMsg", e?.message || String(e));
  }
});

$("btnApprove").addEventListener("click", async () => {
  msg("approveMsg", "");
  try {
    await approve();
  } catch (e) {
    msg("approveMsg", e?.message || String(e));
  }
});

// Optional: react to account/network changes
if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => window.location.reload());
  window.ethereum.on?.("chainChanged", () => window.location.reload());
}
