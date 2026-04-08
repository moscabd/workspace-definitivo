# Checklist de Diagnóstico - Vercel Deploy

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## VERIFICAÇÕES QUE POSSO FAZER (automático)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. Verificar se o Vercel está conectado ao repositório correto
- [ ] Vercel Dashboard → Projeto → Settings → Git
- [ ] Verificar se está conectado em `moscabd/workspace-definitivo`

### 2. Verificar se há branch correta
- [ ] Settings → Git → Branch: `main`

### 3. Verificar build settings
- [ ] Settings → General → Build & Development Settings:
  - [ ] Framework Preset: Other ou None
  - [ ] Build Command: (vazio) ou `echo "Static site"`
  - [ ] Output Directory: `.`

### 4. Forçar novo deploy
- [ ] Ir em Deployments → último deploy → "..." → "Retry"

### 5. Limpar cache do Vercel
- [ ] Settings → General → "Clear Build Cache"

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## VERIFICAÇÕES QUE VOCÊ DEVE FAZER (manual)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Option A: Via Vercel Dashboard
1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto
3. Vá em **Settings → Git**
4. Confirme que está conectado em: `moscabd/workspace-definitivo`
5. Se não estiver conectado → clique em **Connect GitHub** e selecione o repo

### Option B: Re-importar projeto
1. Delete o projeto no Vercel (Settings → General → "Delete Project")
2. Vá em "Add New → Project"
3. Importe novamente o `workspace-definitivo` do GitHub
4. Configure:
   - Framework Preset: **Other**
   - Build Command: (deixe vazio)
   - Output Directory: `.`
5. Deploy

### Option C: Verificar se há outro projeto Vercel
1. Acesse https://vercel.com/dashboard
2. Verifique se há mais de um projeto com nome similar
3. Confirme que está acessando o correto

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## TESTE FINAL
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Após aplicar as correções:
1. Faça uma alteração simples em qualquer arquivo (ex: adicione um comentário)
2. Commit e push
3. Aguarde 1-2 minutos
4. Abra o site em **janela anônima** para evitar cache local
5. Verifique se a alteração apareceu