<div align="center">

# ⚡ HEALTHHUB

**Seu centro de evolução — treinos em casa, sem equipamentos, sem desculpas.**

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)

### 🚀 Acesse o projeto

[![Abrir HealthHub](https://img.shields.io/badge/ABRIR%20HEALTHHUB-c6ff3b?style=for-the-badge&logo=github&logoColor=111)](https://yanduart.github.io/HealthHub/)

🔗 **Link do site:** [https://yanduart.github.io/HealthHub/](https://yanduart.github.io/HealthHub/)

> 📚 **Projeto desenvolvido para fins de estudo e aprendizado.**  
> Construído com HTML, CSS e JavaScript puro — sem frameworks, sem dependências externas.

</div>

---

## ✨ Recursos

- 🧮 Calculadora de IMC com recomendação de nível e objetivo
- 🏋️ Gerador de rotinas de treino em casa
- ⏱️ Cronômetro individual para cada exercício
- 📊 Barra visual de progresso do exercício
- ➡️ Indicação do próximo exercício
- 🔊 Alertas sonoros e contagem regressiva falada
- 📳 Vibração no celular durante os alertas e ao concluir o treino
- 📱 Botão para testar a vibração do dispositivo
- 🔆 Tela sempre ligada durante o cronômetro, quando o navegador permite
- 🎵 Player de música integrado
- 💾 Histórico local com salvamento automático do progresso
- ▶️ Continuação do treino exatamente de onde foi pausado
- 🖼️ Geração de card para compartilhar a evolução
- 📱 Interface responsiva para desktop, tablet e celular

> A vibração funciona principalmente em celulares Android com Chrome ou outro navegador compatível. O aparelho precisa estar com a vibração ativada. Em iPhone e Safari, esse recurso pode ser limitado pelo próprio navegador.

---

## 🔄 Sistema de progresso

O histórico salva automaticamente:

- ✅ Quais exercícios foram **concluídos**
- ⏸️ Em qual exercício o treino foi **pausado**
- ⏱️ O **tempo restante** do cronômetro no momento da pausa
- 📊 O **status** do treino: `Não iniciado` · `Em andamento` · `Pausado` · `Concluído`

Ao clicar em **Continuar treino** no histórico, o app restaura exatamente o ponto onde você parou.

---

## 🛠️ Tecnologias

- **HTML5** — estrutura semântica com abas, modais e controles acessíveis
- **CSS3** — variáveis, glassmorphism, animações e layout responsivo mobile-first
- **JavaScript Vanilla** — sem frameworks e sem dependências de build
- **Font Awesome 6.5** — ícones via CDN
- **Google Fonts** — Bebas Neue + Outfit
- **Web Audio API** — alertas sonoros nativos do cronômetro
- **Vibration API** — alertas táteis em navegadores compatíveis
- **Speech Synthesis API** — contagem e avisos falados
- **Screen Wake Lock API** — mantém a tela ligada quando disponível
- **Web Share API** — compartilhamento do card de treino em dispositivos compatíveis
- **localStorage** — persistência do histórico e do progresso

---

## 📱 Responsividade

| Breakpoint | Layout |
|---|---|
| `> 880px` | Desktop — grid em 2 colunas e navbar completa |
| `≤ 768px` | Tablet — colunas reduzidas e player adaptado |
| `≤ 480px` | Mobile — timer como bottom sheet, layout em coluna e controles touch-friendly |

---

## ▶️ Como usar o projeto

### Acessar diretamente pelo link

Você pode usar o HealthHub sem instalar nada:

🔗 [Abrir o HealthHub](https://yanduart.github.io/HealthHub/)

### Baixar o projeto completo em ZIP

Para baixar todos os arquivos do projeto:

1. Acesse o [repositório no GitHub](https://github.com/yanduart/HealthHub/).
2. Clique no botão verde **Code**.
3. Escolha **Download ZIP**.
4. Extraia o arquivo ZIP no seu computador.

### Clonar o repositório com Git

Se você usa Git, execute:

```bash
git clone https://github.com/yanduart/HealthHub.git
cd HealthHub
```

### Executar localmente

Depois de baixar ou clonar, abra o projeto por um servidor local. Por exemplo, com Python:

```bash
python3 -m http.server 8000
```

Depois, acesse no navegador:

```text
http://localhost:8000
```

> Usar um servidor local é recomendado porque o projeto carrega o arquivo `dados.json` via `fetch`.

---

## 📄 Licença

Este projeto está sob a licença **MIT** — livre para estudar, modificar e compartilhar.

---

<div align="center">

**HEALTHHUB © 2026 — Forjado para quem não para.**

</div>
