# Workspace Definitivo v2.0 - Sistema de Vida Integral

Um sistema completo de organização, planejamento e autossuperação com **IA integrada**.

## 🚀 Funcionalidades Principais

### Propósito & Visão
- **🎯 Ikigai** - Encontre a interseção entre paixão, talento, necessidade e retorno
  - Visualização 4 quadrantes
  - Sugestões com IA (Groq)
  
- **🌟 Visão de Vida** - Defina sua missão, valores e objetivos
  - Missão pessoal refinada com IA
  - Valores core
  - Pilares de vida (Saúde, Família, Trabalho, etc)
  - Objetivos por horizonte (1, 5, 10 anos)

### Núcleo Produtivo
- **✅ Hábitos** - Rastreie hábitos diários e progresso semanal
- **📋 Tarefas** - Organize tarefas com prioridade e prazos
- **🚀 Projetos** - Acompanhe projetos com barra de progresso

### Conhecimento & Recursos
- **🧠 Segundo Cérebro** - Capture ideias, insights, referências
  - Análise inteligente com IA
  - Tags por categoria
  - Timeline de descobertas

- **💪 Bem-Estar** - Rastreie energia, humor, saúde
- **💰 Finanças** - Gerencie entradas, saídas, categorias
- **🛒 Compras** - Lista de compras organizada

### Integração
- **📅 Google Agenda** - Sincronize com sua agenda

---

## 🤖 IA Integrada (Groq API)

Botões "IA" em vários módulos:

- **Ikigai**: ✨ Sugestões com IA → Gera 3-5 caminhos profissionais baseado no seu Ikigai
- **Visão**: ✨ Refinar com IA → Melhora sua missão pessoal com base em valores e objetivos
- **Segundo Cérebro**: 🤖 Análise com IA → Identifica padrões e conexões entre suas ideias

---

## 📂 Estrutura do Projeto

```
workspace-definitivo/
├── index.html              # Entry point
├── assets/
│   ├── css/
│   │   ├── core.css        # Variables, reset, typography
│   │   ├── layout.css      # Sidebar, topbar, grid
│   │   ├── components.css  # Cards, buttons, inputs
│   │   └── pages.css       # Estilos específicos
│   └── js/
│       ├── core/
│       │   ├── storage.js      # LocalStorage abstraction
│       │   ├── utils.js        # Helpers
│       │   ├── events.js       # Event bus
│       │   └── groq.js         # Groq API integration
│       ├── modules/
│       │   ├── ikigai.js
│       │   ├── vision.js
│       │   ├── segundo-cerebro.js
│       │   ├── tarefas.js
│       │   ├── habitos.js
│       │   ├── projetos.js
│       │   ├── financas.js
│       │   ├── bem-estar.js
│       │   ├── compras.js
│       │   └── dashboard.js
│       └── ui/
│           ├── nav.js      # Navigation
│           └── modals.js   # Modal handling
└── README.md
```

---

## 🛠️ Como Usar

### 1. Abrir a Aplicação
Abra `index.html` no navegador. Tudo é offline-first com LocalStorage.

### 2. Começar com Propósito
1. Vá para **Ikigai** e preencha os 4 quadrantes
2. Use ✨ **Sugestões com IA** para ideias
3. Vá para **Visão de Vida** e defina sua missão
4. Use ✨ **Refinar com IA** para melhorar sua missão

### 3. Organizar-se
1. Configure seus **Hábitos** diários
2. Adicione **Tarefas** com prioridade
3. Crie **Projetos** para metas maiores
4. Capture ideias no **Segundo Cérebro**

### 4. Refletir
Volte regularmente para:
- Ver progresso no Dashboard
- Analisar ideias com IA
- Ajustar objetivos conforme necessário

---

## 🔐 Segurança

- **IA Local**: Chave Groq armazenada no código (frontend)
  - ⚠️ Para produção, usar backend API
- **Dados Locais**: Tudo salvo em LocalStorage
  - Nenhum dado enviado a servidor
  - Backup manual: exporte dados em JSON

---

## 📊 Fases de Desenvolvimento

### ✅ Fase 1 (Concluído)
- [x] Arquitetura modularizada
- [x] Módulo Ikigai com 4 quadrantes
- [x] Módulo Visão de Vida completo
- [x] Segundo Cérebro básico
- [x] Integração Groq

### 🚧 Fase 2 (Em Progresso)
- [ ] Hábitos, Tarefas, Projetos full
- [ ] Dashboard Executivo com KPIs
- [ ] Sistema de Alinhamento (Tarefas → Objetivos → Ikigai)

### 📋 Fase 3 (Planejado)
- [ ] Bem-Estar com tracking
- [ ] Analytics & Insights
- [ ] Relatórios (semanal/mensal)

### 🎨 Fase 4 (Planejado)
- [ ] Temas customizáveis
- [ ] Exportar/Importar dados
- [ ] Sincronização com backend (opcional)

---

## 📝 Notas de Desenvolvimento

### Adicionar Novo Módulo
1. Criar arquivo `assets/js/modules/novo-modulo.js`
2. Implementar estrutura:
   ```javascript
   const NovoModulo = {
     init() { /* init */ },
     render(containerId) { /* render */ },
     // ... métodos
   };
   ```
3. Adicionar no `index.html`: `<script src="assets/js/modules/novo-modulo.js"></script>`
4. Adicionar rota em `assets/js/ui/nav.js`

### Usar GroqAPI
```javascript
// Chamada simples
const response = await GroqAPI.chat([
  { role: 'user', content: 'Sua pergunta aqui' }
]);

// Ou usar helpers prontos
await GroqAPI.suggestIkigai(passion, talent, need, returnValue);
await GroqAPI.refineMission(mission, values, objectives);
await GroqAPI.analyzeIdeas(ideas);
```

---

## 🤝 Contribuir

Ideias de melhorias:
1. Integração com Google Calendar
2. Modo dark/light toggle
3. Exportar em PDF/Excel
4. Sincronização com backend
5. Versão mobile app

---

## 📄 Licença

MIT - Livre para usar e modificar

---

**Criado com ❤️ para organização de vida integral**
