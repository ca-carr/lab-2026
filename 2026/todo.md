C) Token logo + token list (so Uniswap can show name/logo without pasting address)
C1. Add the logo file to your GitHub Pages repo

 Create folder: 2026/portfolio/token-erc20/assets/

 Add logo: 2026/portfolio/token-erc20/assets/b161.png

Suggested: PNG, square 256×256 or 512×512, preferably transparent background

After you push, the logo URL will be:
https://ca-carr.github.io/lab-2026/2026/portfolio/token-erc20/assets/b161.png

C2. Create a Sepolia token list JSON (Uniswap Token Lists spec)

 Create file: 2026/portfolio/token-erc20/tokenlist.sepolia.json

 Paste this (edit timestamp if you want):

{
  "name": "Lab 2026 Token List",
  "timestamp": "2026-01-30T00:00:00Z",
  "version": { "major": 1, "minor": 0, "patch": 0 },
  "tokens": [
    {
      "chainId": 11155111,
      "address": "0x3E66479141b71411e8e23aAF6e8DF61f8CE40e7E",
      "name": "BEEM161",
      "symbol": "B161",
      "decimals": 18,
      "logoURI": "https://ca-carr.github.io/lab-2026/2026/portfolio/token-erc20/assets/b161.png"
    }
  ]
}


Token list URL after push:
https://ca-carr.github.io/lab-2026/2026/portfolio/token-erc20/tokenlist.sepolia.json

C3. Add the list to Uniswap (for students)

 In Uniswap UI → Manage token lists (or similar)

 Add list by URL: paste the GitHub Pages token list URL

 Accept the warning about custom lists

 Verify B161 appears by name + logo

Common gotchas

If logo doesn’t show: hard refresh, or change the logo URL to ...b161.png?v=2 (cache bust).

Some UIs may still show a generic icon even with logoURI (policy/caching).

C4. Commit/push

 git add -A

 git commit -m "Add BEEM161 Sepolia token list + logo"

 git push

D) “Real list” option (future)

Uniswap’s default list is curated and typically production-chain focused, so Sepolia tokens generally won’t be accepted there.

If you want a “real listing request” demo later:

 Deploy a mainnet (or production chain) version of the token

 Create real liquidity on that chain

 Submit a request to Uniswap’s default list repo (not guaranteed acceptance)

 Be prepared to also host a logo at a stable URL (many ecosystems use registries; acceptance is still curated)

E) Repo pointers (so you know exactly where everything is)

Token UI

 Student page: 2026/portfolio/token-erc20/index.html

 Admin page: 2026/portfolio/token-erc20/admin.html

JS + config

 Student JS: 2026/portfolio/token-erc20/erc20.js

 Admin JS: 2026/portfolio/token-erc20/admin.js

 Shared config (address, ABI URL, explorer): 2026/portfolio/token-erc20/config.js

ABI

 ABI JSON: 2026/portfolio/token-erc20/abi/BEEM161.abi.json

Styling

 Fancy CSS: 2026/portfolio/token-erc20/style.css

Token list + logo (new)

 Logo: 2026/portfolio/token-erc20/assets/b161.png

 Token list: 2026/portfolio/token-erc20/tokenlist.sepolia.json

If you want, I can also give you a tiny snippet to add to the portfolio page that shows:

contract address (copy button),

token list URL (copy button),

pool link (clickable),
so students have everything in one place.