# 🗂️ Workspace Definitivo

> Seu espaço pessoal de organização — tudo em um lugar só.

Sistema web completo de produtividade pessoal com autenticação, sincronização em nuvem via Supabase, tema claro/escuro, design glassmorphism e suporte total a mobile (PWA).

---

## ✨ Funcionalidades

### 📊 Painel Geral (Dashboard)
- Visão consolidada de hábitos, tarefas, projetos e finanças do dia
- Cards com contagem de hábitos concluídos hoje vs. esperados
- Últimas tarefas pendentes e projetos em andamento
- Saldo financeiro do mês exibido de forma discreta no cartão de Finanças

### ✅ Hábitos
- Criação de hábitos **recorrentes** (dias específicos da semana) e **ocasionais/flexíveis**
- Definição de **duração/meta** e **horário** por hábito
- Seletor visual de dias da semana com toggle interativo
- Mini streak dos últimos 7 dias por hábito
- Barra de progresso semanal completa (dias OK / dias esperados)
- Edição e exclusão de hábitos já criados
- Toggle de conclusão por dia diretamente na listagem

### 📋 Tarefas
- Criação com **descrição**, **prioridade** (Alta / Média / Baixa) e **prazo**
- Separação visual entre tarefas **Pendentes** e **Concluídas**
- Toggle de conclusão com animação
- Exclusão individual de tarefas

### 🛒 Lista de Compras
- Itens organizados por categoria: **Trabalho/Ferramentas** e **Pessoal/Casa/Outros**
- Categorias disponíveis: Trabalho, Pessoal, Casa, Roupas/Calçados, Mercado, Outro
- Toggle visual de "comprado" com riscado
- Exclusão por item

### 💰 Finanças
- Lançamentos de **Entradas** e **Saídas** com descrição, valor e categoria
- Categorias: Trabalho, Despesa Fixa, Lazer, Alimentação, Saúde, Investimento, Outro
- Painel de resumo com **Total entradas**, **Total saídas** e **Saldo**
- Histórico de lançamentos em ordem cronológica reversa
- Saldo com cor dinâmica (verde positivo / vermelho negativo)

### 🚀 Projetos
- Criação com nome, descrição, categoria e progresso inicial
- Barra de progresso visual por projeto
- Atualização de progresso a qualquer momento via modal
- Categorias: Trabalho, Pessoal, Estudo, Financeiro

### 🧠 Segundo Cérebro
- Capture ideias, pensamentos, insights e referências livremente
- Tags por tipo: 💡 Ideia, 🚀 Projeto, 📚 Aprendizado, 🔮 Reflexão, 🔗 Referência, 📌 Outro
- Timeline de notas em ordem reversa com data de registro

### 📅 Google Agenda
- **Desktop:** Agenda incorporada (iframe) diretamente na tela do sistema
- **Desktop:** Botão para criar novo evento abre em popup elegante
- **Android:** Botões abrem o **app nativo Google Calendar** via Android Intent URI
- **iOS:** Redireciona para o Google Agenda no navegador
- Fallback automático para a versão web se o app não estiver instalado

---

## 🎨 Design & Experiência

- **Tema Escuro / Claro** — botão 🌙/☀️ na topbar; preferência salva no navegador
- **Glassmorphism** — sidebar, topbar, cards e nav mobile com efeito vidro fosco (`backdrop-filter: blur`)
- **Efeito de seleção na nav** — item ativo com fundo roxo translúcido + barra lateral brilhante e transição suave
- **Animações profissionais** — todas as transições usam `cubic-bezier` para feel premium
- **Responsivo total** — layout completamente adaptado para celular, tablet e desktop sem quebrar o visual original

---

## 📱 Suporte Mobile (PWA)

- Pode ser **instalado na tela inicial** do Android e iOS como app nativo
- Navegação inferior (bottom nav) com os 7 módulos: Painel, Hábitos, Tarefas, Finanças, Projetos, Cérebro, Agenda
- Layout completamente refeito para telas menores
- Fontes e espaçamentos escalados corretamente para celular
- Google Agenda abre o app Android nativo via Intent URI

---

## 🔐 Autenticação & Dados

- **Login com Google** via Supabase Auth
- Dados sincronizados em nuvem por usuário (Supabase PostgreSQL)
- Tabelas: `habitos`, `tarefas`, `compras`, `financas`, `projetos`, `brain`
- **Modo Dev local** (localhost): pula autenticação e usa `localStorage` para testes
- Sanitização de inputs contra XSS em todos os campos

---

## 🏗️ Estrutura do Projeto

```
workspace-definitivo/
├── app.html              # Aplicativo principal (SPA)
├── index.html            # Entry point / redirect
├── manifest.json         # PWA manifest
├── vercel.json           # Configuração de deploy (Vercel)
├── supabase-setup.sql    # Script SQL para criar as tabelas
├── assets/
│   ├── css/
│   │   └── app.css       # Todo o CSS: temas, glassmorphism, responsivo
│   ├── js/
│   │   └── app.js        # Toda a lógica: auth, CRUD, render, agenda, tema
│   └── img/
│       └── icon.png      # Ícone do app (PWA)
└── README.md
```

---

## 🚀 Como Usar

### Acessar Online
Abra o link do deploy (Vercel) no navegador ou celular.

### Instalar no Celular (Android/iOS)
1. Abra o site no Chrome (Android) ou Safari (iOS)
2. Toque no menu → **"Adicionar à tela inicial"**
3. O app aparece como ícone nativo no celular

### Configurar localmente
```bash
# Clone o repositório
git clone https://github.com/moscabd/workspace-definitivo.git

# Abra com um servidor local (ex: Live Server no VS Code)
# OU abra app.html direto no navegador (funciona em modo dev)
```

---

## ⚙️ Configuração Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o `supabase-setup.sql` no SQL Editor do Supabase
3. Copie sua `SUPABASE_URL` e `SUPABASE_ANON_KEY`
4. Substitua as constantes no início de `assets/js/app.js`:
```javascript
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co'
const SUPABASE_KEY = 'sua-anon-key-aqui'
```
5. Ative o **Google OAuth** em Authentication → Providers → Google

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 + CSS3 | Estrutura e estilos (sem frameworks) |
| JavaScript (Vanilla) | Toda a lógica do app |
| Supabase | Auth (Google OAuth) + banco de dados PostgreSQL |
| Google Calendar Embed | Integração da agenda no desktop |
| Android Intent URI | Deep link para app nativo no Android |
| PWA / Web App Manifest | Instalação como app no celular |
| Vercel | Hospedagem e deploy contínuo |
| Google Fonts (Inter + Syne) | Tipografia |

---

## 📄 Licença

MIT — livre para usar, modificar e distribuir.

---

**Feito com ❤️ para organização de vida pessoal e profissional.**
