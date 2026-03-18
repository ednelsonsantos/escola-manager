# Comparativo de Licenças Open Source para o Escola Manager

## Licenças analisadas

### 1. MIT
**Tipo:** Permissiva  
**Compatível com dependências:** ✅ Sim  
**Free to use para sempre:** ⚠️ Parcialmente — alguém pode pegar o código, modificar e vender como proprietário **sem obrigação de abrir o código**

### 2. Apache 2.0
**Tipo:** Permissiva com proteção de patentes  
**Compatível com dependências:** ✅ Sim  
**Free to use para sempre:** ⚠️ Parcialmente — igual ao MIT, permite uso proprietário sem devolver melhorias

### 3. GPL-3.0 ✅ RECOMENDADA
**Tipo:** Copyleft forte  
**Compatível com dependências:** ✅ Sim (todas as deps são MIT/ISC)  
**Free to use para sempre:** ✅ Sim — qualquer versão modificada **tem que ser publicada com o mesmo código** sob GPL  
**Para software desktop:** É a licença padrão do setor (Linux, GCC, Git usam GPL)

### 4. AGPL-3.0
**Tipo:** Copyleft forte + network use  
**Compatível com dependências:** ✅ Sim  
**Free to use para sempre:** ✅ Sim — ainda mais forte que GPL, cobre serviços web  
**Para software desktop:** Desnecessária — o Escola Manager não é um servidor web

### 5. EUPL-1.2
**Tipo:** Copyleft europeu  
**Compatível com GPL:** ✅ Sim  
**Free to use para sempre:** ✅ Sim  
**Diferencial:** Produzida pela União Europeia, válida em todos os sistemas jurídicos europeus

---

## Por que GPL-3.0 é a certa para este projeto?

**Objetivo declarado:** "sempre free to use"

A GPL-3.0 garante isso com a cláusula de **copyleft**:

> "Se você distribuir uma versão modificada, deve distribuir também o código-fonte completo sob a mesma licença GPL."

Isso significa:

| Situação | MIT | GPL-3.0 |
|----------|-----|---------|
| Escola usa o app gratuitamente | ✅ | ✅ |
| Programador melhora e distribui grátis | ✅ | ✅ obrigado a abrir código |
| Empresa pega o código e vende versão fechada | ✅ permitido | ❌ proibido |
| Contribuição de volta para o projeto | opcional | obrigatório se distribuir |

---

## O que a GPL-3.0 permite e proíbe

### ✅ PERMITIDO
- Usar o software gratuitamente para qualquer finalidade
- Modificar o código para uso interno (sem precisar publicar)
- Distribuir cópias gratuitamente
- Distribuir versões modificadas (com obrigação de abrir o código)
- Cobrar por suporte, treinamento ou hospedagem

### ❌ PROIBIDO
- Distribuir uma versão modificada sem publicar o código-fonte
- Converter para licença proprietária
- Remover os avisos de copyright e licença

---

## Arquivo necessários para a licença ser válida

1. **`LICENSE`** — texto completo da GPL-3.0 ✅ já criado
2. **`package.json`** com `"license": "GPL-3.0-or-later"` ✅ já atualizado
3. **Cabeçalho nos arquivos principais** (recomendado, não obrigatório)

### Cabeçalho recomendado para os arquivos .jsx/.js:
```
// Escola Manager — Sistema de Gestão para Escolas de Idiomas
// Copyright (C) 2024  Escola Manager Contributors
// SPDX-License-Identifier: GPL-3.0-or-later
// https://github.com/ednelsonsantos/escola-manager
```

---

## Referências

- GPL-3.0 completa: https://www.gnu.org/licenses/gpl-3.0.txt
- Escolher licença: https://choosealicense.com
- Compatibilidade de licenças: https://www.gnu.org/licenses/license-compatibility.html
