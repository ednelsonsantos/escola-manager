# 📦 Guia de Instalação — Escola Manager v5

## ✅ Requisitos

| Ferramenta     | Versão mínima | Verificar com           |
|---------------|--------------|------------------------|
| Node.js        | 18.x ou 20.x  | `node --version`        |
| npm            | 9.x+          | `npm --version`         |
| Windows        | 10/11 64-bit  | —                       |

> ⚠️ **Node 20.20.1** (sua versão) é totalmente compatível.

---

## 🚀 Instalação passo a passo

### 1. Extrair o projeto
```
Extraia a pasta escola-v5 em qualquer local, ex: C:\projetos\escola-v5
```

### 2. Abrir terminal na pasta
```
Clique com botão direito dentro da pasta → "Abrir no Terminal"
```

### 3. Instalar dependências
```bash
npm install
```
> O `npm install` já roda `electron-builder install-app-deps` automaticamente
> via `postinstall`, que **recompila o better-sqlite3** para o Electron.
> Isso pode levar 1-2 minutos na primeira vez.

### 4. Rodar em modo desenvolvimento
```bash
npm run dev
```
O app abrirá automaticamente.

---

## ❗ Problemas comuns

### "better-sqlite3 bindings not found" ou "NODE_MODULE_VERSION mismatch"

Isso significa que o módulo nativo não foi recompilado para o Electron.
Solução:
```bash
npx electron-builder install-app-deps
npm run dev
```

### "ELECTRON_RUN_AS_NODE" ou erro de permissão

```bash
# Limpe o cache e reinstale
rm -rf node_modules
npm install
```

### O app abre mas diz "Banco não disponível"

Verifique se o `postinstall` rodou corretamente:
```bash
npm run postinstall
```
Se falhar, instale o Visual Studio Build Tools:
https://visualstudio.microsoft.com/visual-cpp-build-tools/
(Marque "Desenvolvimento para Desktop com C++" durante a instalação)

---

## 🏗️ Gerar instalador Windows (.exe)

```bash
npm run build
```
O arquivo `.exe` será gerado em `dist/` — pode distribuir para outros computadores.

---

## 🔐 Login inicial

| Usuário       | Senha     |
|--------------|----------|
| `admin`       | admin123  |
| `secretaria`  | sec123    |
| `demo`        | demo      |

O banco de dados fica em:
```
C:\Users\<seu-usuario>\AppData\Roaming\Escola Manager\escola.db
```
