/* =============================================================
   HEALTHHUB — script.js (otimizado + desbloqueio sequencial)
   ============================================================= */

let dados = null;

let treinoAtivo = {
    rotina: null,
    exercicioAtual: null,
    indexAtual: 0,
    concluidos: [],
    tempoRestante: 0
};

const HIST_KEY = 'healthhub_historico_v1';

/* ---------- CARREGA DADOS ---------- */
fetch('dados.json')
    .then(r => r.json())
    .then(j => {
        dados = j;
        const stat = document.getElementById('statExercicios');
        if (stat) stat.textContent = j.exercicios.length;
    })
    .catch(err => console.error('Falha ao carregar dados.json:', err));

/* ---------- DIÁLOGO PRÓPRIO (substitui alert/confirm do navegador) ---------- */
// Retorna uma Promise: true (OK) ou false (Cancelar)
function dialogHH(msg, { confirmar = false, ok = 'OK', cancelar = 'Cancelar' } = {}) {
    return new Promise(resolve => {
        const ov = document.getElementById('hhDialog');
        const txt = document.getElementById('hhDialogMsg');
        const btnOk = document.getElementById('hhDialogOk');
        const btnCancel = document.getElementById('hhDialogCancel');

        txt.textContent = msg;
        btnOk.textContent = ok;
        btnCancel.textContent = cancelar;
        btnCancel.style.display = confirmar ? '' : 'none';
        ov.classList.add('show');
        btnOk.focus();

        function fechar(valor) {
            ov.classList.remove('show');
            btnOk.onclick = null;
            btnCancel.onclick = null;
            document.removeEventListener('keydown', onKey);
            resolve(valor);
        }
        function onKey(e) {
            if (e.key === 'Escape') fechar(!confirmar);
            if (e.key === 'Enter') fechar(true);
        }

        btnOk.onclick = () => fechar(true);
        btnCancel.onclick = () => fechar(false);
        document.addEventListener('keydown', onKey);
    });
}

/* ---------- NAVEGAÇÃO ---------- */
function abrirAba(nome) {
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const page = document.querySelector(`[data-page="${nome}"]`);
    const link = document.querySelector(`[data-tab="${nome}"]`);
    if (page) page.classList.add('active');
    if (link) link.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'auto' });

    if (nome === 'historico') {
        renderHistorico();
        renderHistStats();
    }
}

/* ---------- IMC ---------- */

// Aceita "1,50", "1.80", "70,5", "175", "175cm", "70kg"... e devolve número (ou NaN)
function parseNumero(valor) {
    if (valor == null) return NaN;
    const limpo = String(valor).replace(/[^\d.,]/g, '').replace(',', '.');
    return /^\d+(\.\d+)?$/.test(limpo) ? parseFloat(limpo) : NaN;
}

// O IMC precisa ser calculado ao menos uma vez para liberar o gerador de rotina
const IMC_KEY = 'healthhub_imc_v1';

function imcConcluido() {
    try { return !!JSON.parse(localStorage.getItem(IMC_KEY)); }
    catch { return false; }
}

function atualizarTravaGerador() {
    const btn = document.getElementById('gerarBtn');
    if (!btn) return;
    const liberado = imcConcluido();
    btn.classList.toggle('locked', !liberado);
    btn.innerHTML = liberado
        ? '<i class="fa-solid fa-bolt"></i> GERAR MINHA ROTINA <span class="btn-shine"></span>'
        : '<i class="fa-solid fa-lock"></i> CALCULE SEU IMC PRIMEIRO <span class="btn-shine"></span>';
}

function calcularIMC() {
    const peso = parseNumero(document.getElementById('imcPeso').value);
    let alturaCm = parseNumero(document.getElementById('imcAltura').value);
    // altura em metros (1,50 / 1.80 / 2) vira centímetros
    if (alturaCm && alturaCm <= 3) alturaCm *= 100;
    const idade = parseInt(document.getElementById('imcIdade').value, 10);
    const out = document.getElementById('imcResultado');

    if (!peso || !alturaCm || peso < 20 || peso > 300 || alturaCm < 100 || alturaCm > 250) {
        out.innerHTML = '<div class="imc-warn"><i class="fa-solid fa-triangle-exclamation"></i> Informe peso (ex: 70 ou 70,5) e altura (ex: 1,75 ou 175) válidos.</div>';
        out.classList.add('show');
        return;
    }

    const altura = alturaCm / 100;
    const imc = peso / (altura * altura);

    // IMC concluído: libera o gerador de rotina
    try { localStorage.setItem(IMC_KEY, JSON.stringify({ imc: Number(imc.toFixed(1)), data: new Date().toISOString() })); } catch (e) { /* ignora */ }
    atualizarTravaGerador();

    let categoria, classe, nivelRec, objetivoRec, descricao;

    if (imc < 18.5) {
        categoria = 'Abaixo do peso'; classe = 'cyan';
        nivelRec = 'iniciante'; objetivoRec = 'ganho_massa';
        descricao = 'Foque em ganhar massa muscular gradualmente. Comece com treinos leves e priorize uma alimentação rica em proteínas.';
    } else if (imc < 25) {
        categoria = 'Peso normal'; classe = 'lime';
        nivelRec = (idade && idade > 50) ? 'iniciante' : 'intermediário';
        objetivoRec = 'manutencao';
        descricao = 'Você está em ótima forma! Foque em manter sua composição corporal com treinos consistentes.';
    } else if (imc < 30) {
        categoria = 'Sobrepeso'; classe = 'amber';
        nivelRec = 'iniciante'; objetivoRec = 'emagrecimento';
        descricao = 'Comece devagar para evitar lesões. Combine cardio leve com uma dieta balanceada para resultados sustentáveis.';
    } else if (imc < 35) {
        categoria = 'Obesidade Grau I'; classe = 'orange';
        nivelRec = 'iniciante'; objetivoRec = 'emagrecimento';
        descricao = 'Comece com exercícios de baixo impacto e foque em consistência. Considere consultar um profissional.';
    } else {
        categoria = 'Obesidade Grau II+'; classe = 'red';
        nivelRec = 'iniciante'; objetivoRec = 'emagrecimento';
        descricao = 'Recomendamos fortemente acompanhamento médico e nutricional antes de iniciar qualquer rotina intensa.';
    }

    const nivelLabel = { iniciante: 'Iniciante', 'intermediário': 'Intermediário', 'avançado': 'Avançado' }[nivelRec];
    const objetivoLabel = { emagrecimento: 'Emagrecimento', ganho_massa: 'Ganho de Massa', manutencao: 'Manutenção' }[objetivoRec];

    out.innerHTML =
        `<div class="imc-card-result ${classe}">
            <div class="imc-num-block">
                <span class="imc-num-label">SEU IMC</span>
                <span class="imc-num">${imc.toFixed(1)}</span>
                <span class="imc-categoria">${categoria}</span>
            </div>
            <div class="imc-info">
                <p class="imc-desc">${descricao}</p>
                <div class="imc-recomendacao">
                    <div class="imc-rec-item"><span class="imc-rec-label">Nível recomendado</span><span class="imc-rec-value">${nivelLabel}</span></div>
                    <div class="imc-rec-item"><span class="imc-rec-label">Objetivo recomendado</span><span class="imc-rec-value">${objetivoLabel}</span></div>
                </div>
                <button class="btn-apply" onclick="aplicarRecomendacao('${nivelRec}', '${objetivoRec}')">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> APLICAR RECOMENDAÇÃO
                </button>
            </div>
        </div>`;

    out.classList.add('show');
}

function aplicarRecomendacao(nivel, objetivo) {
    document.getElementById('NivelSelect').value = nivel;
    document.getElementById('ObjetivoSelect').value = objetivo;

    const btn = document.querySelector('.imc-resultado .btn-apply');
    if (btn) {
        btn.classList.add('applied');
        setTimeout(() => btn.classList.remove('applied'), 1800);
    }

    const gerador = document.querySelector('.card.glass-card:not(.imc-card)');
    if (gerador) gerador.scrollIntoView({ behavior: 'auto', block: 'center' });
}

/* ---------- GERAR ROTINA ---------- */
function gerarRotina() {
    if (!imcConcluido()) {
        dialogHH('Antes de gerar sua rotina, calcule seu IMC no card "Descubra seu ponto de partida".').then(() => {
            const card = document.querySelector('.imc-card');
            if (card) card.scrollIntoView({ behavior: 'auto', block: 'center' });
            const peso = document.getElementById('imcPeso');
            if (peso) peso.focus();
        });
        return;
    }

    if (!dados) { dialogHH('Aguarde os dados carregarem!'); return; }

    const nivel = document.getElementById('NivelSelect').value;
    const objetivo = document.getElementById('ObjetivoSelect').value;

    // filtra pelo nível e garante a sequência pela "ordem" do dados.json
    const exercicios = dados.exercicios
        .filter(ex => ex.nivel === nivel)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const alimentos = dados.alimentos[objetivo] || [];

    treinoAtivo = { rotina: null, exercicioAtual: null, indexAtual: 0, concluidos: [], tempoRestante: 0 };

    renderExercicios(exercicios, [], 0);
    renderAlimentos(alimentos);

    const resultado = document.getElementById('resultado');
    resultado.classList.add('show');

    const rotina = {
        id: Date.now(),
        data: new Date().toISOString(),
        nivel,
        objetivo,
        exercicios,
        alimentos,
        progresso: { concluidos: [], indexAtual: 0, tempoRestante: 0, status: 'pendente' }
    };

    treinoAtivo.rotina = rotina;
    salvarHistorico(rotina);

    setTimeout(() => resultado.scrollIntoView({ behavior: 'auto', block: 'start' }), 50);
}

/* ---------- PROGRESSÃO / DESBLOQUEIO ---------- */

// Um exercício só libera quando TODOS os anteriores já foram concluídos
function exercicioDesbloqueado(index, concluidos) {
    for (let k = 0; k < index; k++) {
        if (!concluidos.includes(k)) return false;
    }
    return true;
}

// Índice do primeiro exercício ainda não concluído (-1 se todos feitos)
function proximoPendente(total, concluidos) {
    for (let i = 0; i < total; i++) {
        if (!concluidos.includes(i)) return i;
    }
    return -1;
}

/* ---------- RENDER EXERCÍCIOS (DocumentFragment) ---------- */
function renderExercicios(lista, concluidos = [], indexAtual = 0) {
    const container = document.getElementById('exercicios');
    if (!container) return;

    container.innerHTML = '';

    if (!lista.length) {
        container.innerHTML = '<div class="hist-empty">Nenhum exercício para este nível.</div>';
        return;
    }

    const frag = document.createDocumentFragment();

    lista.forEach((ex, i) => {
        const concluido = concluidos.includes(i);
        const desbloqueado = exercicioDesbloqueado(i, concluidos);
        const ativo = i === indexAtual && !concluido && desbloqueado;

        const div = document.createElement('div');
        div.className = 'item'
            + (concluido ? ' ex-concluido' : '')
            + (ativo ? ' ex-ativo' : '')
            + (!concluido && !desbloqueado ? ' bloqueado' : '');
        div.dataset.testid = `exercicio-item-${i}`;
        div.style.animationDelay = `${i * 40}ms`;

        const icone = concluido
            ? '<i class="fa-solid fa-circle-check ex-check"></i>'
            : (ativo ? '<i class="fa-solid fa-chevron-right ex-playing"></i>' : '');

        let acao;
        if (concluido) {
            acao = '<span class="badge-done"><i class="fa-solid fa-check"></i> Feito</span>';
        } else if (!desbloqueado) {
            acao = '<span class="badge-lock"><i class="fa-solid fa-lock"></i> Bloqueado</span>';
        } else {
            acao = `<button class="timer-trigger" data-index="${i}"><i class="fa-solid fa-stopwatch"></i></button>`;
        }

        div.innerHTML = `
            ${icone}
            <div class="item-info">
                <span class="item-name">${ex.nome}</span>
                <span class="item-meta">${ex.tipo}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                <span class="item-badge">${ex.duracao}</span>
                ${acao}
            </div>`;

        if (!concluido && desbloqueado) {
            div.querySelector('.timer-trigger').addEventListener('click', () => {
                abrirTimerComProgresso(ex, i, 0);
            });
        }

        frag.appendChild(div);
    });

    container.appendChild(frag);

    // aviso de progressão no topo da lista
    const prox = proximoPendente(lista.length, concluidos);
    if (prox !== -1 && prox < lista.length - 1) {
        const aviso = document.createElement('div');
        aviso.className = 'hist-empty';
        aviso.textContent = `Complete o exercício ${prox + 1} (${lista[prox].nome}) para desbloquear o próximo.`;
        container.prepend(aviso);
    }
}

/* ---------- RENDER ALIMENTOS (DocumentFragment) ---------- */
function renderAlimentos(lista) {
    const container = document.getElementById('alimentos');
    if (!container) return;

    container.innerHTML = '';

    if (!lista.length) {
        container.innerHTML = '<div class="hist-empty">Sem sugestões para este objetivo.</div>';
        return;
    }

    const frag = document.createDocumentFragment();

    lista.forEach((al, i) => {
        const div = document.createElement('div');
        div.className = 'item';
        div.dataset.testid = `alimento-item-${i}`;
        div.style.animationDelay = `${i * 40}ms`;
        div.innerHTML = `
            <div class="item-info">
                <span class="item-name">${al.nome}</span>
                <span class="item-meta">${al.tipo}</span>
            </div>
            <span class="al-tipo">${al.tipo.split(' ')[0]}</span>`;
        frag.appendChild(div);
    });

    container.appendChild(frag);
}

/* ---------- HISTÓRICO ---------- */
function salvarHistorico(rotina) {
    let lista = lerHistorico(); // let: a lista é reatribuída abaixo
    const idx = lista.findIndex(r => r.id === rotina.id);
    if (idx !== -1) lista[idx] = rotina;
    else {
        lista.unshift(rotina);
        lista = lista.slice(0, 12);
    }
    localStorage.setItem(HIST_KEY, JSON.stringify(lista));
}

function lerHistorico() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; }
    catch { return []; }
}

function salvarProgresso(status, tempoRestante) {
    if (!treinoAtivo.rotina) return;
    const lista = lerHistorico();
    const idx = lista.findIndex(r => r.id === treinoAtivo.rotina.id);
    if (idx === -1) return;

    const totalEx = lista[idx].exercicios.length;
    const feitos = treinoAtivo.concluidos.length;
    const st = feitos >= totalEx ? 'concluido' : status;

    lista[idx].progresso = {
        concluidos: treinoAtivo.concluidos.slice(),
        indexAtual: treinoAtivo.indexAtual,
        tempoRestante: tempoRestante || 0,
        status: st
    };

    treinoAtivo.rotina = lista[idx];
    localStorage.setItem(HIST_KEY, JSON.stringify(lista));
}

function marcarExercicioConcluido(index) {
    if (!treinoAtivo.concluidos.includes(index)) treinoAtivo.concluidos.push(index);

    const exercicios = treinoAtivo.rotina ? treinoAtivo.rotina.exercicios : [];
    const proximo = proximoPendente(exercicios.length, treinoAtivo.concluidos);
    treinoAtivo.indexAtual = proximo === -1 ? index : proximo;
    treinoAtivo.tempoRestante = 0;

    const st = treinoAtivo.concluidos.length >= exercicios.length ? 'concluido' : 'em_andamento';
    salvarProgresso(st, 0);

    if (treinoAtivo.rotina) {
        renderExercicios(treinoAtivo.rotina.exercicios, treinoAtivo.concluidos, treinoAtivo.indexAtual);
    }
}

function renderHistStats() {
    const container = document.getElementById('histStats');
    if (!container) return;

    const lista = lerHistorico();
    const total = lista.length;
    const objetivos = lista.reduce((a, r) => { a[r.objetivo] = (a[r.objetivo] || 0) + 1; return a; }, {});
    const niveis = lista.reduce((a, r) => { a[r.nivel] = (a[r.nivel] || 0) + 1; return a; }, {});
    const objTop = Object.entries(objetivos).sort((a, b) => b[1] - a[1])[0];
    const nivTop = Object.entries(niveis).sort((a, b) => b[1] - a[1])[0];
    const objLabel = { emagrecimento: 'Emagrecimento', ganho_massa: 'Ganho de Massa', manutencao: 'Manutenção' };

    container.innerHTML =
        `<div class="hstat"><span class="hstat-num">${total}</span><span class="hstat-label">Rotinas geradas</span></div>
         <div class="hstat"><span class="hstat-num">${objTop ? objLabel[objTop[0]] : '—'}</span><span class="hstat-label">Objetivo favorito</span></div>
         <div class="hstat"><span class="hstat-num" style="text-transform:capitalize">${nivTop ? nivTop[0] : '—'}</span><span class="hstat-label">Nível mais usado</span></div>`;
}

function renderHistorico() {
    const container = document.getElementById('historicoLista');
    if (!container) return;

    const lista = lerHistorico();

    if (!lista.length) {
        container.innerHTML = '<div class="hist-empty"><i class="fa-solid fa-folder-open" style="font-size:32px;margin-bottom:12px;display:block"></i>Nenhuma rotina salva ainda.<br/><small>Volte ao Gerador para criar a primeira.</small></div>';
        return;
    }

    container.innerHTML = lista.map(r => {
        const d = new Date(r.data);
        const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const objetivoLabel = ({ emagrecimento: 'Emagrecimento', ganho_massa: 'Ganho de Massa', manutencao: 'Manutenção' })[r.objetivo] || r.objetivo;

        const prog = r.progresso || { concluidos: [], indexAtual: 0, status: 'pendente', tempoRestante: 0 };
        const totalEx = r.exercicios.length;
        const feitos = prog.concluidos.length;
        const pct = totalEx ? Math.round((feitos / totalEx) * 100) : 0;

        const statusMap = { pendente: 'Não iniciado', em_andamento: 'Em andamento', pausado: 'Pausado', concluido: 'Concluído' };
        const statusCls = { pendente: 'st-pendente', em_andamento: 'st-ativo', pausado: 'st-pausado', concluido: 'st-concluido' };

        let infoPausado = '';
        if ((prog.status === 'pausado' || prog.status === 'em_andamento') && r.exercicios[prog.indexAtual]) {
            const exNome = r.exercicios[prog.indexAtual].nome;
            let tempoTxt = '';
            if (prog.tempoRestante > 0) {
                const m = String(Math.floor(prog.tempoRestante / 60)).padStart(2, '0');
                const s = String(prog.tempoRestante % 60).padStart(2, '0');
                tempoTxt = ` — ${m}:${s} restante`;
            }
            infoPausado = `<div class="hist-proximo"><i class="fa-solid fa-stopwatch"></i> ${exNome}${tempoTxt}</div>`;
        }

        const btnContinuar = (prog.status === 'pausado' || prog.status === 'em_andamento')
            ? `<button class="hist-continuar" onclick="continuarTreino(${r.id})"><i class="fa-solid fa-play"></i> Continuar treino</button>`
            : '';

        return `<div class="hist-card" data-testid="hist-card-${r.id}">
            <button class="hist-del" onclick="removerHist(${r.id})"><i class="fa-solid fa-xmark"></i></button>
            <div class="hist-date">${data} · ${hora}</div>
            <div class="hist-meta">${r.nivel.toUpperCase()} · ${totalEx} EXERCÍCIOS</div>
            <div class="hist-tags">
                <span class="hist-tag">${r.nivel}</span>
                <span class="hist-tag cyan">${objetivoLabel}</span>
                <span class="hist-tag ${statusCls[prog.status]}">${statusMap[prog.status]}</span>
            </div>
            <div class="prog-wrap">
                <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
                <span class="prog-txt">${feitos}/${totalEx} exercícios</span>
            </div>
            ${infoPausado}
            ${btnContinuar}
            <button class="hist-replay hist-share" onclick="compartilharTreino(${r.id})"><i class="fa-solid fa-share-nodes"></i> Compartilhar</button>
            <button class="hist-replay" onclick="reaplicarRotina(${r.id})"><i class="fa-solid fa-rotate-right"></i> Refazer do zero</button>
        </div>`;
    }).join('');
}

function continuarTreino(id) {
    const rotina = lerHistorico().find(r => r.id === id);
    if (!rotina) return;

    treinoAtivo.rotina = rotina;
    treinoAtivo.concluidos = rotina.progresso.concluidos.slice();
    treinoAtivo.indexAtual = rotina.progresso.indexAtual;
    treinoAtivo.tempoRestante = rotina.progresso.tempoRestante;

    document.getElementById('NivelSelect').value = rotina.nivel;
    document.getElementById('ObjetivoSelect').value = rotina.objetivo;

    renderExercicios(rotina.exercicios, treinoAtivo.concluidos, treinoAtivo.indexAtual);
    renderAlimentos(rotina.alimentos);

    document.getElementById('resultado').classList.add('show');
    abrirAba('gerador');

    setTimeout(() => {
        const ex = rotina.exercicios[treinoAtivo.indexAtual];
        if (ex) abrirTimerComProgresso(ex, treinoAtivo.indexAtual, treinoAtivo.tempoRestante);
        document.getElementById('resultado').scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 200);
}

function reaplicarRotina(id) {
    const rotina = lerHistorico().find(r => r.id === id);
    if (!rotina) return;
    document.getElementById('NivelSelect').value = rotina.nivel;
    document.getElementById('ObjetivoSelect').value = rotina.objetivo;
    abrirAba('gerador');
    setTimeout(() => gerarRotina(), 200);
}

function removerHist(id) {
    const lista = lerHistorico().filter(r => r.id !== id);
    localStorage.setItem(HIST_KEY, JSON.stringify(lista));
    renderHistorico();
    renderHistStats();
}

async function limparHistorico() {
    if (!lerHistorico().length) return;
    const confirmou = await dialogHH('Tem certeza que deseja apagar todo o histórico?', { confirmar: true, ok: 'Apagar' });
    if (confirmou) {
        localStorage.removeItem(HIST_KEY);
        renderHistorico();
        renderHistStats();
    }
}

/* ---------- MÚSICA (playlist) ---------- */
// O navegador não consegue "listar" uma pasta, então as músicas ficam registradas aqui.
// Para adicionar uma nova: coloque o arquivo na pasta do site e escreva o nome do arquivo na lista.
// Exemplos: 'Music.mp3', 'Treino Pesado.mp3', 'musicas/Foco Total.mp3'
// O nome que aparece na escolha é gerado sozinho a partir do nome do arquivo.
const MUSICAS = ['Music.mp3'];
let musicaAtual = 0;

// 'musicas/Treino_Pesado.mp3' -> 'Treino Pesado'
function nomeMusica(arquivo) {
    const base = arquivo.split('/').pop().replace(/\.[^.]+$/, '');
    return base.replace(/[_-]+/g, ' ').trim();
}

function iniciarMusica() {
    const musica = document.getElementById('musica');
    if (!musica || !MUSICAS.length) return;

    musica.src = encodeURI(MUSICAS[musicaAtual]);
    musica.addEventListener('play', () => atualizarBotaoMusica(true));
    musica.addEventListener('pause', () => atualizarBotaoMusica(false));
    // terminou: vai para a próxima (com uma só música, ela recomeça)
    musica.addEventListener('ended', () => tocarMusica((musicaAtual + 1) % MUSICAS.length));

    renderListaMusicas();

    document.addEventListener('click', e => {
        if (!e.target.closest('.music-wrap')) fecharListaMusicas();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') fecharListaMusicas();
    });
}

function atualizarBotaoMusica(tocando) {
    const btn = document.getElementById('musicBtn');
    const icon = document.getElementById('musicIcon');
    const label = document.getElementById('musicLabel');
    const wrap = document.getElementById('musicWrap');

    if (tocando) {
        icon.className = 'fa-solid fa-pause';
        label.textContent = 'Pausar';
        btn.classList.add('playing');
        wrap.classList.add('playing');
    } else {
        icon.className = 'fa-solid fa-play';
        label.textContent = 'Tocar';
        btn.classList.remove('playing');
        wrap.classList.remove('playing');
    }
    renderListaMusicas();
}

function tocarMusica(i) {
    const musica = document.getElementById('musica');
    if (!musica || !MUSICAS[i]) return;

    if (i !== musicaAtual) {
        musicaAtual = i;
        musica.src = encodeURI(MUSICAS[i]);
    } else if (musica.ended) {
        musica.currentTime = 0;
    }

    musica.play().catch(() => {
        dialogHH(`Não foi possível tocar "${nomeMusica(MUSICAS[i])}". Confira se o arquivo ${MUSICAS[i]} está na pasta do site.`);
    });
    renderListaMusicas();
}

// Botão play/pause principal
function toggleMusica() {
    const musica = document.getElementById('musica');
    if (musica.paused) tocarMusica(musicaAtual);
    else musica.pause();
}

// Clique em uma música da lista
function selecionarMusica(i) {
    const musica = document.getElementById('musica');
    if (i === musicaAtual && !musica.paused) musica.pause(); // é a atual e está tocando -> pausa
    else tocarMusica(i);                                      // outra música (ou atual pausada) -> toca
    fecharListaMusicas();
}

function renderListaMusicas() {
    const lista = document.getElementById('musicLista');
    const musica = document.getElementById('musica');
    if (!lista) return;

    lista.innerHTML = '';

    if (!MUSICAS.length) {
        lista.innerHTML = '<div class="hist-empty">Nenhuma música cadastrada.</div>';
        return;
    }

    const tocando = musica && !musica.paused;

    MUSICAS.forEach((arquivo, i) => {
        const atual = i === musicaAtual;
        let icone = 'fa-music';
        if (atual) icone = tocando ? 'fa-volume-high' : 'fa-pause';

        const btn = document.createElement('button');
        btn.className = 'music-item' + (atual ? ' atual' : '');
        btn.innerHTML = `<i class="fa-solid ${icone}"></i><span></span>`;
        btn.querySelector('span').textContent = nomeMusica(arquivo);
        btn.addEventListener('click', () => selecionarMusica(i));
        lista.appendChild(btn);
    });
}

function toggleListaMusicas() {
    const painel = document.getElementById('musicPanel');
    const btn = document.getElementById('musicListBtn');
    const aberto = painel.classList.toggle('show');
    btn.classList.toggle('open', aberto);
}

function fecharListaMusicas() {
    const painel = document.getElementById('musicPanel');
    const btn = document.getElementById('musicListBtn');
    if (painel) painel.classList.remove('show');
    if (btn) btn.classList.remove('open');
}

/* ---------- RECURSOS DO NAVEGADOR: TELA LIGADA, VOZ, VIBRAÇÃO, COMPARTILHAR ---------- */

// Avisos mostrados dentro do timer quando tela ligada / vibração não funcionam
const avisosTimer = { tela: '', vibracao: '' };

function renderAvisoTimer() {
    const el = document.getElementById('timerAviso');
    if (!el) return;
    const txt = [avisosTimer.tela, avisosTimer.vibracao].filter(Boolean).join(' ');
    el.textContent = txt;
    el.style.display = txt ? 'block' : 'none';
}

// Explica o motivo mais provável de um recurso não funcionar
function motivoIndisponivel() {
    if (window.self !== window.top) return 'o site está dentro de outra página (prévia). Abra o endereço dele direto no navegador.';
    if (!window.isSecureContext) return 'o site precisa estar em HTTPS.';
    return 'o navegador ou o celular bloqueou (confira economia de bateria e permissões).';
}

// 1) Wake Lock — impede a tela de apagar enquanto o timer está aberto
let wakeLock = null;
let wakeLockPendente = false;

function timerAberto() {
    const ov = document.getElementById('timerOverlay');
    return !!(ov && ov.classList.contains('show'));
}

async function manterTelaLigada() {
    if (wakeLock || wakeLockPendente) return;

    if (!('wakeLock' in navigator)) {
        avisosTimer.tela = `Tela ligada indisponível: ${motivoIndisponivel()}`;
        renderAvisoTimer();
        return;
    }

    wakeLockPendente = true;
    try {
        const lock = await navigator.wakeLock.request('screen');
        if (!timerAberto()) {          // o timer fechou enquanto pedíamos
            lock.release().catch(() => {});
        } else {
            wakeLock = lock;
            wakeLock.addEventListener('release', () => { wakeLock = null; });
            avisosTimer.tela = '';
        }
    } catch (e) {
        avisosTimer.tela = `Tela ligada indisponível: ${motivoIndisponivel()}`;
    } finally {
        wakeLockPendente = false;
        renderAvisoTimer();
    }
}

function liberarTela() {
    if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
    }
}

// o navegador solta o bloqueio ao trocar de aba; pega de novo ao voltar
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && timerAberto()) manterTelaLigada();
});

// 2) Speech Synthesis — o site fala (pode ligar/desligar no timer)
const VOZ_KEY = 'healthhub_voz';
let vozAtiva = localStorage.getItem(VOZ_KEY) !== '0';

function falar(texto) {
    if (!vozAtiva || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = 'pt-BR';
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
    } catch (e) { /* ignora */ }
}

function atualizarBotaoVoz() {
    const btn = document.getElementById('timerVozBtn');
    if (!btn) return;
    btn.innerHTML = vozAtiva
        ? '<i class="fa-solid fa-volume-high"></i>'
        : '<i class="fa-solid fa-volume-xmark"></i>';
    btn.classList.toggle('off', !vozAtiva);
}

function toggleVoz() {
    vozAtiva = !vozAtiva;
    localStorage.setItem(VOZ_KEY, vozAtiva ? '1' : '0');
    if (!vozAtiva && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    atualizarBotaoVoz();
}

// 3) Vibration — vibra o celular (não funciona no iPhone/Safari)
function vibrar(padrao) {
    try {
        if (!('vibrate' in navigator)) {
            avisosTimer.vibracao = 'Vibração indisponível: este navegador não suporta (iPhone/Safari não vibram por sites).';
        } else if (navigator.vibrate(padrao) === false) {
            avisosTimer.vibracao = `Vibração bloqueada: ${motivoIndisponivel()}`;
        } else {
            avisosTimer.vibracao = '';
        }
    } catch (e) {
        avisosTimer.vibracao = 'Vibração indisponível neste navegador.';
    }
    renderAvisoTimer();
}

// Fala e vibra ao concluir um exercício / o treino todo
function anunciarConclusao() {
    const rotina = treinoAtivo.rotina;
    if (!rotina) return;

    const total = rotina.exercicios.length;
    const feitos = treinoAtivo.concluidos.length;

    if (feitos >= total) {
        falar('Treino concluído! Parabéns!');
        vibrar([300, 100, 300, 100, 500]);
        setTimeout(async () => {
            const quer = await dialogHH('Treino concluído! Quer compartilhar sua conquista?', {
                confirmar: true, ok: 'Compartilhar', cancelar: 'Agora não'
            });
            if (quer) compartilharTreino(rotina.id);
        }, 1800);
    } else {
        const prox = rotina.exercicios[treinoAtivo.indexAtual];
        if (prox) falar(`Exercício concluído. Próximo: ${prox.nome}`);
    }
}

// 4) Web Share — compartilha uma IMAGEM (card com tabela) do treino, sem link
function retanguloArredondado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Desenha o card do treino num canvas e devolve um Blob PNG
async function gerarImagemTreino(r) {
    try {
        await Promise.all([
            document.fonts.load('80px "Bebas Neue"'),
            document.fonts.load('600 32px "Outfit"'),
            document.fonts.load('400 24px "Outfit"')
        ]);
    } catch (e) { /* usa fonte padrão */ }

    const prog = r.progresso || { concluidos: [], status: 'pendente' };
    const n = r.exercicios.length;
    const feitos = prog.concluidos.length;
    const pct = n ? Math.round((feitos / n) * 100) : 0;
    const concluido = prog.status === 'concluido';

    const COR = {
        bg: '#07090c', surface: '#12161c', linha: 'rgba(255,255,255,0.08)',
        texto: '#f3f5f7', dim: '#a3adb8', mute: '#6b7480',
        accent: '#c6ff3b', cyan: '#00e0ff'
    };
    const W = 1080, PAD = 72, ROW = 104;
    const TAB_Y = 560;
    const H = TAB_Y + n * ROW + 190;

    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // fundo
    ctx.fillStyle = COR.bg;
    ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, 820);
    g.addColorStop(0, 'rgba(198,255,59,0.20)'); g.addColorStop(1, 'rgba(198,255,59,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(W, H, 0, W, H, 820);
    g.addColorStop(0, 'rgba(0,224,255,0.16)'); g.addColorStop(1, 'rgba(0,224,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.textBaseline = 'alphabetic';

    // logo (quadrado verde inclinado com raio, igual ao do site)
    ctx.save();
    ctx.translate(PAD + 44, 106);
    ctx.rotate(-6 * Math.PI / 180);
    ctx.shadowColor = 'rgba(198,255,59,0.55)';
    ctx.shadowBlur = 28;
    retanguloArredondado(ctx, -44, -44, 88, 88, 22);
    ctx.fillStyle = COR.accent;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    const raio = [[0.58, 0.14], [0.28, 0.56], [0.48, 0.56], [0.40, 0.86], [0.72, 0.42], [0.52, 0.42]];
    ctx.beginPath();
    raio.forEach(([bx, by], i) => {
        const px = -44 + bx * 88;
        const py = -44 + by * 88;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();

    // nome da marca
    const marcaX = PAD + 88 + 28;
    ctx.font = '84px "Bebas Neue", Impact, sans-serif';
    ctx.fillStyle = COR.texto;
    ctx.fillText('HEALTH', marcaX, 138);
    const wHealth = ctx.measureText('HEALTH').width;
    ctx.fillStyle = COR.accent;
    ctx.fillText('HUB', marcaX + wHealth, 138);

    // data (canto direito)
    const dataTxt = new Date(r.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    ctx.font = '400 28px "Outfit", Arial, sans-serif';
    ctx.fillStyle = COR.mute;
    ctx.textAlign = 'right';
    ctx.fillText(dataTxt, W - PAD, 135);
    ctx.textAlign = 'left';

    // status
    ctx.font = '600 28px "Outfit", Arial, sans-serif';
    ctx.fillStyle = concluido ? COR.accent : COR.cyan;
    ctx.fillText(concluido ? 'TREINO CONCLUÍDO' : 'MEU TREINO', PAD, 200);

    // chips: nível e objetivo
    const objLabel = { emagrecimento: 'Emagrecimento', ganho_massa: 'Ganho de Massa', manutencao: 'Manutenção' }[r.objetivo] || r.objetivo;
    const nivelTxt = r.nivel.charAt(0).toUpperCase() + r.nivel.slice(1);
    let cx = PAD;
    [[nivelTxt, COR.accent], [objLabel, COR.cyan]].forEach(([txt, cor]) => {
        ctx.font = '600 28px "Outfit", Arial, sans-serif';
        const w = ctx.measureText(txt).width + 56;
        retanguloArredondado(ctx, cx, 232, w, 58, 29);
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
        ctx.strokeStyle = cor; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = cor;
        ctx.fillText(txt, cx + 28, 271);
        cx += w + 16;
    });

    // progresso
    ctx.font = '400 24px "Outfit", Arial, sans-serif';
    ctx.fillStyle = COR.mute;
    ctx.fillText('PROGRESSO', PAD, 365);

    ctx.font = '130px "Bebas Neue", Impact, sans-serif';
    ctx.fillStyle = COR.accent;
    ctx.fillText(`${feitos}/${n}`, PAD, 485);

    const wNum = ctx.measureText(`${feitos}/${n}`).width;
    const barX = PAD + wNum + 40;
    const barW = W - PAD - barX;
    retanguloArredondado(ctx, barX, 430, barW, 24, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    if (pct > 0) {
        retanguloArredondado(ctx, barX, 430, Math.max(24, barW * pct / 100), 24, 12);
        ctx.fillStyle = COR.accent; ctx.fill();
    }
    ctx.font = '600 28px "Outfit", Arial, sans-serif';
    ctx.fillStyle = COR.dim;
    ctx.textAlign = 'right';
    ctx.fillText(`${pct}% dos exercícios`, W - PAD, 486);
    ctx.textAlign = 'left';

    // tabela de exercícios
    retanguloArredondado(ctx, PAD, TAB_Y - 20, W - PAD * 2, n * ROW + 40, 28);
    ctx.fillStyle = COR.surface; ctx.fill();
    ctx.strokeStyle = COR.linha; ctx.lineWidth = 2; ctx.stroke();

    r.exercicios.forEach((ex, i) => {
        const y = TAB_Y + i * ROW;
        const cy = y + ROW / 2;
        const feito = prog.concluidos.includes(i);

        if (i > 0) {
            ctx.strokeStyle = COR.linha; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(PAD + 36, y); ctx.lineTo(W - PAD - 36, y); ctx.stroke();
        }

        // marcador
        const mx = PAD + 70;
        ctx.beginPath(); ctx.arc(mx, cy, 22, 0, Math.PI * 2);
        if (feito) {
            ctx.fillStyle = COR.accent; ctx.fill();
            ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(mx - 10, cy); ctx.lineTo(mx - 3, cy + 8); ctx.lineTo(mx + 11, cy - 9);
            ctx.stroke();
        } else {
            ctx.strokeStyle = COR.mute; ctx.lineWidth = 3; ctx.stroke();
        }

        // nome e tipo
        ctx.textAlign = 'left';
        ctx.font = '600 36px "Outfit", Arial, sans-serif';
        ctx.fillStyle = feito ? COR.texto : COR.dim;
        ctx.fillText(ex.nome, PAD + 124, cy - 2);
        ctx.font = '400 22px "Outfit", Arial, sans-serif';
        ctx.fillStyle = COR.mute;
        ctx.fillText(String(ex.tipo).toUpperCase(), PAD + 124, cy + 30);

        // duração (badge à direita)
        ctx.font = '38px "Bebas Neue", Impact, sans-serif';
        const dw = ctx.measureText(ex.duracao).width + 40;
        const dx = W - PAD - 40 - dw;
        retanguloArredondado(ctx, dx, cy - 26, dw, 52, 26);
        ctx.fillStyle = 'rgba(198,255,59,0.10)'; ctx.fill();
        ctx.strokeStyle = 'rgba(198,255,59,0.30)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = COR.accent;
        ctx.fillText(ex.duracao, dx + 20, cy + 13);
    });

    // rodapé
    ctx.textAlign = 'center';
    ctx.font = '400 26px "Outfit", Arial, sans-serif';
    ctx.fillStyle = COR.mute;
    ctx.fillText('HEALTHHUB  ·  Forjado para quem não para.', W / 2, H - 70);
    ctx.textAlign = 'left';

    return new Promise(resolve => c.toBlob(resolve, 'image/png'));
}

function baixarArquivo(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ----- janela de compartilhamento (prévia + opções) -----
let shareBlob = null;
let shareNome = '';
let shareUrl = null;

function setShareHint(texto) {
    const el = document.getElementById('shareHint');
    if (el) el.textContent = texto || '';
}

async function compartilharTreino(id) {
    const r = lerHistorico().find(x => x.id === id);
    if (!r) return;

    try {
        const blob = await gerarImagemTreino(r);
        if (!blob) throw new Error('Falha ao gerar a imagem');
        const nome = `healthhub-treino-${new Date(r.data).toISOString().slice(0, 10)}.png`;
        abrirShare(blob, nome);
    } catch (e) {
        dialogHH('Não foi possível gerar a imagem agora.');
    }
}

function abrirShare(blob, nome) {
    if (shareUrl) URL.revokeObjectURL(shareUrl);
    shareBlob = blob;
    shareNome = nome;
    shareUrl = URL.createObjectURL(blob);

    document.getElementById('sharePreview').src = shareUrl;
    setShareHint('');

    const arquivo = new File([blob], nome, { type: 'image/png' });
    const podeNativo = !!(navigator.canShare && navigator.canShare({ files: [arquivo] }));
    // celular/tablet (inclui iPad que se apresenta como Mac)
    const celular = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));

    // menu nativo: só onde há suporte; WhatsApp Web: só no computador
    document.getElementById('shareNativeBtn').style.display = podeNativo ? '' : 'none';
    document.getElementById('shareWppBtn').style.display = celular ? 'none' : '';

    // no celular sem menu nativo, explica o motivo
    if (celular && !podeNativo) {
        setShareHint(window.isSecureContext
            ? 'Seu navegador não abre o menu de compartilhar. Baixe a imagem e envie pelo app.'
            : 'O menu de compartilhar do celular só funciona com HTTPS (site publicado, como no GitHub Pages). Por enquanto, baixe a imagem e envie pelo app.');
    }

    document.getElementById('shareOverlay').classList.add('show');
}

function fecharShare() {
    const ov = document.getElementById('shareOverlay');
    if (ov) ov.classList.remove('show');
    if (shareUrl) { URL.revokeObjectURL(shareUrl); shareUrl = null; }
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharShare();
});

// Menu nativo de compartilhar (celular e alguns navegadores de PC)
async function compartilharNativo() {
    if (!shareBlob) return;
    const arquivo = new File([shareBlob], shareNome, { type: 'image/png' });
    try {
        await navigator.share({ files: [arquivo], title: 'Meu treino no HealthHub' });
    } catch (e) {
        if (e.name !== 'AbortError') setShareHint('Não foi possível compartilhar agora.');
    }
}

// WhatsApp Web: o site não consegue anexar a imagem sozinho, então copiamos
// a imagem e abrimos o WhatsApp Web — é só colar (Ctrl+V) na conversa.
async function compartilharWhatsApp() {
    if (!shareBlob) return;
    try {
        if (!navigator.clipboard || !window.ClipboardItem) throw new Error('sem clipboard');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': shareBlob })]);
        const aba = window.open('https://web.whatsapp.com/', '_blank', 'noopener');
        setShareHint(aba
            ? '✅ Imagem copiada! No WhatsApp Web, abra a conversa e aperte Ctrl+V para colar.'
            : '✅ Imagem copiada! Abra o WhatsApp Web, entre na conversa e aperte Ctrl+V.');
    } catch (e) {
        baixarArquivo(shareBlob, shareNome);
        window.open('https://web.whatsapp.com/', '_blank', 'noopener');
        setShareHint('Não consegui copiar, então baixei a imagem. No WhatsApp Web, use o clipe 📎 para anexar.');
    }
}

function baixarShare() {
    if (!shareBlob) return;
    baixarArquivo(shareBlob, shareNome);
    setShareHint('Imagem baixada!');
}

/* ---------- TIMER (requestAnimationFrame + debounce) ---------- */
let timerInterval = null;
let timerRemaining = 0;
let timerInitial = 0;
let timerRunning = false;
let timerIndexAtual = -1;
let lastSave = 0;

function parseDuracao(d) {
    if (!d) return 60;
    const lower = d.toLowerCase();
    const minutos = lower.match(/(\d+)\s*minuto/);
    if (minutos) return parseInt(minutos[1], 10) * 60;
    const segundos = lower.match(/(\d+)s/);
    if (segundos) return parseInt(segundos[1], 10);
    return 45;
}

function abrirTimerComProgresso(ex, index, tempoSalvo) {
    const btnAnt = document.getElementById('btnConcluirEx');
    if (btnAnt) btnAnt.remove();

    timerIndexAtual = typeof index !== 'undefined' ? index : -1;
    timerInitial = parseDuracao(ex.duracao);
    timerRemaining = (tempoSalvo && tempoSalvo > 0) ? tempoSalvo : timerInitial;

    document.getElementById('timerExercicio').textContent = ex.nome;
    document.getElementById('timerMeta').textContent = `${ex.duracao} · ${ex.tipo}`;

    if (timerIndexAtual !== -1 && treinoAtivo.rotina) {
        treinoAtivo.indexAtual = timerIndexAtual;
        treinoAtivo.exercicioAtual = ex;
        salvarProgresso('em_andamento', timerRemaining);
        renderExercicios(treinoAtivo.rotina.exercicios, treinoAtivo.concluidos, timerIndexAtual);
    }

    atualizarDisplay();
    document.getElementById('timerOverlay').classList.add('show');
    avisosTimer.tela = '';
    avisosTimer.vibracao = '';
    renderAvisoTimer();
    manterTelaLigada(); // tela fica ligada enquanto o timer estiver aberto
    setTimerBtn(false);
    mostrarBotaoConcluir(timerIndexAtual);
}

function fecharTimer() {
    if (timerRunning) pauseTimer();
    liberarTela();
    if (timerIndexAtual !== -1) salvarProgresso('pausado', timerRemaining);
    document.getElementById('timerOverlay').classList.remove('show');
}

// Fecha o timer com efeito de explosão (partículas + modal estourando e sumindo)
function explodirFecharTimer() {
    const overlay = document.getElementById('timerOverlay');
    const modal = overlay && overlay.querySelector('.timer-modal');
    if (!overlay || !modal || !overlay.classList.contains('show')) return;

    const r = modal.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const total = 28;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < total; i++) {
        const p = document.createElement('span');
        p.className = 'burst-particle' + (i % 3 === 0 ? ' cyan' : '');
        const ang = (Math.PI * 2 * i) / total + Math.random() * 0.4;
        const dist = 120 + Math.random() * 140;
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
        frag.appendChild(p);
    }

    overlay.appendChild(frag);
    modal.classList.add('explodindo');
    overlay.classList.add('saindo');

    setTimeout(() => {
        overlay.classList.remove('show', 'saindo');
        modal.classList.remove('explodindo');
        liberarTela();
        overlay.querySelectorAll('.burst-particle').forEach(p => p.remove());
    }, 700);
}

function atualizarDisplay() {
    const m = String(Math.floor(timerRemaining / 60)).padStart(2, '0');
    const s = String(timerRemaining % 60).padStart(2, '0');
    const display = document.getElementById('timerDisplay');
    display.textContent = `${m}:${s}`;
    if (timerRemaining <= 5 && timerRunning) display.classList.add('urgent');
    else display.classList.remove('urgent');
}

function toggleTimer() {
    timerRunning ? pauseTimer() : startTimer();
}

function startTimer() {
    if (timerRemaining <= 0) timerRemaining = timerInitial;
    getAudioCtx(); // destrava o áudio no clique (exigência de celular/Safari)
    timerRunning = true;
    setTimerBtn(true);
    manterTelaLigada();
    vibrar(80); // pequena vibração ao iniciar (dentro do toque do usuário) — também testa o recurso
    if (timerRemaining === timerInitial) {
        falar(`Começando ${document.getElementById('timerExercicio').textContent}`);
    }
    if (timerIndexAtual !== -1) salvarProgresso('em_andamento', timerRemaining);

    let lastTick = Date.now();

    function tick() {
        if (!timerRunning) return;
        const now = Date.now();
        if (now - lastTick >= 1000) {
            lastTick = now;
            timerRemaining--;
            atualizarDisplay();

            // bip de contagem regressiva nos últimos 5 segundos
            if (timerRemaining > 0 && timerRemaining <= 5) {
                beepContagem(timerRemaining);
                vibrar(timerRemaining === 1 ? 250 : 120); // 40ms era curto demais para muitos celulares
                if (timerRemaining <= 3) falar(String(timerRemaining));
            }

            // salva só a cada 15s em vez de 5s
            if (timerIndexAtual !== -1 && now - lastSave > 15000) {
                lastSave = now;
                salvarProgresso('em_andamento', timerRemaining);
            }

            if (timerRemaining <= 0) {
                pauseTimer();
                beepFinal();
                vibrar([300, 120, 300]);
                document.getElementById('timerDisplay').textContent = '00:00';
                if (timerIndexAtual !== -1) {
                    marcarExercicioConcluido(timerIndexAtual);
                    const meta = document.getElementById('timerMeta');
                    if (meta) meta.innerHTML = '<span style="color:var(--accent)"><i class="fa-solid fa-circle-check"></i> EXERCÍCIO CONCLUÍDO!</span>';
                    const btnAnt = document.getElementById('btnConcluirEx');
                    if (btnAnt) btnAnt.remove();
                    // deixa a mensagem de concluído aparecer um instante e fecha com efeito
                    setTimeout(explodirFecharTimer, 900);
                    anunciarConclusao();
                }
                return;
            }
        }
        timerInterval = requestAnimationFrame(tick);
    }
    timerInterval = requestAnimationFrame(tick);
}

function pauseTimer() {
    timerRunning = false;
    if (timerInterval) cancelAnimationFrame(timerInterval);
    setTimerBtn(false);
    if (timerIndexAtual !== -1) salvarProgresso('pausado', timerRemaining);
}

function resetTimer() {
    pauseTimer();
    timerRemaining = timerInitial;
    atualizarDisplay();
    if (timerIndexAtual !== -1) salvarProgresso('pausado', timerRemaining);
}

function setTimerBtn(running) {
    const btn = document.getElementById('timerStartBtn');
    if (!btn) return;
    btn.innerHTML = running
        ? '<i class="fa-solid fa-pause"></i> Pausar'
        : '<i class="fa-solid fa-play"></i> Iniciar';
}

function mostrarBotaoConcluir(index) {
    if (index === -1) return;
    if (document.getElementById('btnConcluirEx')) return;

    const btn = document.createElement('button');
    btn.id = 'btnConcluirEx';
    btn.className = 'btn-apply';
    btn.style.cssText = 'margin-top:16px;width:100%;justify-content:center;border-radius:var(--radius);';
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Marcar como feito';
    btn.onclick = () => { marcarExercicioConcluido(index); fecharTimer(); anunciarConclusao(); };

    const controls = document.querySelector('.timer-controls');
    if (controls) controls.insertAdjacentElement('afterend', btn);
}

/* ---------- SOM (Web Audio API, reutiliza AudioContext) ---------- */
let audioCtx = null;

function getAudioCtx() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    } catch (e) { return null; }
}

// Toca um tom: frequência (Hz), duração (s), volume, tipo de onda, atraso (s)
function tocarTom(freq, dur, vol = 0.25, tipo = 'sine', atraso = 0) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t = ctx.currentTime + atraso;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur);
}

// Bip curto a cada segundo (5, 4, 3, 2, 1); o último é mais agudo
function beepContagem(seg) {
    tocarTom(seg === 1 ? 1100 : 800, 0.15, 0.25, 'square');
}

// Som de finalização: dois bips + tom final mais longo
function beepFinal() {
    tocarTom(1175, 0.22, 0.3, 'sine', 0);
    tocarTom(1175, 0.22, 0.3, 'sine', 0.3);
    tocarTom(1568, 0.7, 0.3, 'sine', 0.6);
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
    renderHistorico();
    renderHistStats();
    iniciarMusica();
    atualizarBotaoVoz();
    atualizarTravaGerador();
});
