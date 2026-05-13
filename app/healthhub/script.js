/* =============================================================
   HEALTHHUB — script.js
   ============================================================= */

let dados = null;

// ---------- ESTADO DO TREINO ATIVO ----------
let treinoAtivo = {
    rotina: null,
    exercicioAtual: null,
    indexAtual: 0,
    concluidos: [],
    tempoRestante: 0
};

// ---------- CARREGA DADOS ----------
fetch('dados.json')
    .then(function (r) { return r.json(); })
    .then(function (j) {
        dados = j;
        var stat = document.getElementById('statExercicios');
        if (stat) stat.textContent = j.exercicios.length;
    })
    .catch(function (err) { console.error('Falha ao carregar dados.json:', err); });

// ---------- NAVEGAÇÃO POR ABAS ----------
function abrirAba(nome) {
    document.querySelectorAll('.tab-page').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('active'); });

    var page = document.querySelector('[data-page="' + nome + '"]');
    var link = document.querySelector('[data-tab="' + nome + '"]');
    if (page) page.classList.add('active');
    if (link) link.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (nome === 'historico') {
        renderHistorico();
        renderHistStats();
    }
}

// ---------- CALCULADORA IMC ----------
function calcularIMC() {
    var peso     = parseFloat(document.getElementById('imcPeso').value);
    var alturaCm = parseFloat(document.getElementById('imcAltura').value);
    var idade    = parseInt(document.getElementById('imcIdade').value, 10);
    var out      = document.getElementById('imcResultado');

    if (!peso || !alturaCm) {
        out.innerHTML = '<div class="imc-warn"><i class="fa-solid fa-triangle-exclamation"></i> Preencha peso e altura para calcular.</div>';
        out.classList.add('show');
        return;
    }

    var altura = alturaCm / 100;
    var imc    = peso / (altura * altura);
    var categoria, classe, nivelRec, objetivoRec, descricao;

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

    var nivelLabel    = { iniciante: 'Iniciante', 'intermediário': 'Intermediário', 'avançado': 'Avançado' }[nivelRec];
    var objetivoLabel = { emagrecimento: 'Emagrecimento', ganho_massa: 'Ganho de Massa', manutencao: 'Manutenção' }[objetivoRec];

    out.innerHTML =
        '<div class="imc-card-result ' + classe + '">' +
            '<div class="imc-num-block">' +
                '<span class="imc-num-label">SEU IMC</span>' +
                '<span class="imc-num">' + imc.toFixed(1) + '</span>' +
                '<span class="imc-categoria">' + categoria + '</span>' +
            '</div>' +
            '<div class="imc-info">' +
                '<p class="imc-desc">' + descricao + '</p>' +
                '<div class="imc-recomendacao">' +
                    '<div class="imc-rec-item"><span class="imc-rec-label">Nível recomendado</span><span class="imc-rec-value">' + nivelLabel + '</span></div>' +
                    '<div class="imc-rec-item"><span class="imc-rec-label">Objetivo recomendado</span><span class="imc-rec-value">' + objetivoLabel + '</span></div>' +
                '</div>' +
                '<button class="btn-apply" onclick="aplicarRecomendacao(\'' + nivelRec + '\', \'' + objetivoRec + '\')" data-testid="aplicar-rec-btn">' +
                    '<i class="fa-solid fa-wand-magic-sparkles"></i> APLICAR RECOMENDAÇÃO' +
                '</button>' +
            '</div>' +
        '</div>';

    out.classList.add('show');
}

function aplicarRecomendacao(nivel, objetivo) {
    document.getElementById('NivelSelect').value    = nivel;
    document.getElementById('ObjetivoSelect').value = objetivo;

    var btn = document.querySelector('[data-testid="aplicar-rec-btn"]');
    if (btn) {
        var oldHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> APLICADO!';
        btn.classList.add('applied');
        setTimeout(function () { btn.innerHTML = oldHTML; btn.classList.remove('applied'); }, 1800);
    }

    var gerador = document.querySelector('.card.glass-card:not(.imc-card)');
    if (gerador) gerador.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- GERAR ROTINA ----------
function gerarRotina() {
    if (!dados) { alert('Aguarde os dados carregarem!'); return; }

    var nivel    = document.getElementById('NivelSelect').value;
    var objetivo = document.getElementById('ObjetivoSelect').value;

    var exercicios = dados.exercicios.filter(function (ex) { return ex.nivel === nivel; });
    var alimentos  = dados.alimentos[objetivo] || [];

    treinoAtivo = { rotina: null, exercicioAtual: null, indexAtual: 0, concluidos: [], tempoRestante: 0 };

    renderExercicios(exercicios, [], 0);
    renderAlimentos(alimentos);

    var resultado = document.getElementById('resultado');
    resultado.classList.add('show');

    var rotina = {
        id: Date.now(),
        data: new Date().toISOString(),
        nivel: nivel,
        objetivo: objetivo,
        exercicios: exercicios,
        alimentos: alimentos,
        progresso: {
            concluidos: [],
            indexAtual: 0,
            tempoRestante: 0,
            status: 'pendente'
        }
    };

    treinoAtivo.rotina = rotina;
    salvarHistorico(rotina);

    setTimeout(function () { resultado.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
}

// ---------- RENDER EXERCÍCIOS ----------
function renderExercicios(lista, concluidos, indexAtual) {
    var container = document.getElementById('exercicios');
    if (!container) return;
    concluidos = concluidos || [];
    if (typeof indexAtual === 'undefined') indexAtual = 0;

    if (!lista.length) {
        container.innerHTML = '<div class="hist-empty">Nenhum exercício para este nível.</div>';
        return;
    }

    container.innerHTML = lista.map(function (ex, i) {
        var exJson    = JSON.stringify(ex).replace(/'/g, '&apos;').replace(/"/g, '&quot;');
        var concluido = concluidos.indexOf(i) !== -1;
        var ativo     = (i === indexAtual) && !concluido;
        var cls       = concluido ? ' ex-concluido' : (ativo ? ' ex-ativo' : '');

        var icone = concluido
            ? '<i class="fa-solid fa-circle-check ex-check"></i>'
            : (ativo ? '<i class="fa-solid fa-chevron-right ex-playing"></i>' : '');

        var acaoBotao = concluido
            ? '<span class="badge-done"><i class="fa-solid fa-check"></i> Feito</span>'
            : '<button class="timer-trigger" title="Iniciar cronômetro" onclick="abrirTimerComProgresso(' + exJson + ', ' + i + ')" data-testid="timer-trigger-' + i + '"><i class="fa-solid fa-stopwatch"></i></button>';

        return '<div class="item' + cls + '" style="animation-delay:' + (i * 60) + 'ms" data-testid="exercicio-item-' + i + '">' +
            icone +
            '<div class="item-info">' +
                '<span class="item-name">' + ex.nome + '</span>' +
                '<span class="item-meta">' + ex.tipo + '</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
                '<span class="item-badge">' + ex.duracao + '</span>' +
                acaoBotao +
            '</div>' +
        '</div>';
    }).join('');
}

// ---------- RENDER ALIMENTOS ----------
function renderAlimentos(lista) {
    var container = document.getElementById('alimentos');
    if (!container) return;
    if (!lista.length) {
        container.innerHTML = '<div class="hist-empty">Sem sugestões para este objetivo.</div>';
        return;
    }
    container.innerHTML = lista.map(function (al, i) {
        return '<div class="item" style="animation-delay:' + (i * 60) + 'ms" data-testid="alimento-item-' + i + '">' +
            '<div class="item-info">' +
                '<span class="item-name">' + al.nome + '</span>' +
                '<span class="item-meta">' + al.tipo + '</span>' +
            '</div>' +
            '<span class="al-tipo">' + al.tipo.split(' ')[0] + '</span>' +
        '</div>';
    }).join('');
}

// ---------- SALVA PROGRESSO ----------
function salvarProgresso(status, tempoRestante) {
    if (!treinoAtivo.rotina) return;
    var lista = lerHistorico();
    var idx   = lista.findIndex(function (r) { return r.id === treinoAtivo.rotina.id; });
    if (idx === -1) return;

    var totalEx = lista[idx].exercicios.length;
    var feitos  = treinoAtivo.concluidos.length;
    var st      = (feitos >= totalEx) ? 'concluido' : status;

    lista[idx].progresso = {
        concluidos:    treinoAtivo.concluidos.slice(),
        indexAtual:    treinoAtivo.indexAtual,
        tempoRestante: tempoRestante || 0,
        status:        st
    };

    treinoAtivo.rotina = lista[idx];
    localStorage.setItem(HIST_KEY, JSON.stringify(lista));
}

function marcarExercicioConcluido(index) {
    if (treinoAtivo.concluidos.indexOf(index) === -1) {
        treinoAtivo.concluidos.push(index);
    }

    var exercicios = treinoAtivo.rotina ? treinoAtivo.rotina.exercicios : [];
    var proximo = -1;
    for (var i = 0; i < exercicios.length; i++) {
        if (treinoAtivo.concluidos.indexOf(i) === -1) { proximo = i; break; }
    }
    treinoAtivo.indexAtual    = proximo === -1 ? index : proximo;
    treinoAtivo.tempoRestante = 0;

    var st = (treinoAtivo.concluidos.length >= exercicios.length) ? 'concluido' : 'em_andamento';
    salvarProgresso(st, 0);

    if (treinoAtivo.rotina) {
        renderExercicios(treinoAtivo.rotina.exercicios, treinoAtivo.concluidos, treinoAtivo.indexAtual);
    }
}

// ---------- HISTÓRICO ----------
var HIST_KEY = 'healthhub_historico_v1';

function salvarHistorico(rotina) {
    var lista = lerHistorico();
    var idx   = lista.findIndex(function (r) { return r.id === rotina.id; });
    if (idx !== -1) { lista[idx] = rotina; }
    else { lista.unshift(rotina); lista = lista.slice(0, 12); }
    localStorage.setItem(HIST_KEY, JSON.stringify(lista));
}

function lerHistorico() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; }
    catch (e) { return []; }
}

function renderHistStats() {
    var container = document.getElementById('histStats');
    if (!container) return;
    var lista    = lerHistorico();
    var total    = lista.length;
    var objetivos = lista.reduce(function (acc, r) { acc[r.objetivo] = (acc[r.objetivo] || 0) + 1; return acc; }, {});
    var niveis    = lista.reduce(function (acc, r) { acc[r.nivel]    = (acc[r.nivel]    || 0) + 1; return acc; }, {});
    var objTop   = Object.entries(objetivos).sort(function (a, b) { return b[1] - a[1]; })[0];
    var nivTop   = Object.entries(niveis).sort(function (a, b)    { return b[1] - a[1]; })[0];
    var objLabel = { emagrecimento: 'Emagrecimento', ganho_massa: 'Ganho de Massa', manutencao: 'Manutenção' };

    container.innerHTML =
        '<div class="hstat"><span class="hstat-num">' + total + '</span><span class="hstat-label">Rotinas geradas</span></div>' +
        '<div class="hstat"><span class="hstat-num">' + (objTop ? objLabel[objTop[0]] : '—') + '</span><span class="hstat-label">Objetivo favorito</span></div>' +
        '<div class="hstat"><span class="hstat-num" style="text-transform:capitalize">' + (nivTop ? nivTop[0] : '—') + '</span><span class="hstat-label">Nível mais usado</span></div>';
}

function renderHistorico() {
    var container = document.getElementById('historicoLista');
    if (!container) return;
    var lista = lerHistorico();

    if (!lista.length) {
        container.innerHTML =
            '<div class="hist-empty">' +
                '<i class="fa-solid fa-folder-open" style="font-size:32px;margin-bottom:12px;display:block"></i>' +
                'Nenhuma rotina salva ainda.<br/>' +
                '<small>Volte ao Gerador para criar a primeira.</small>' +
            '</div>';
        return;
    }

    container.innerHTML = lista.map(function (r) {
        var d    = new Date(r.data);
        var data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        var hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        var objetivoLabel = ({ emagrecimento: 'Emagrecimento', ganho_massa: 'Ganho de Massa', manutencao: 'Manutenção' })[r.objetivo] || r.objetivo;

        var prog     = r.progresso || { concluidos: [], indexAtual: 0, status: 'pendente', tempoRestante: 0 };
        var totalEx  = r.exercicios.length;
        var feitos   = prog.concluidos.length;
        var pct      = totalEx ? Math.round((feitos / totalEx) * 100) : 0;

        var statusMap = { pendente: 'Não iniciado', em_andamento: 'Em andamento', pausado: 'Pausado', concluido: 'Concluído' };
        var statusCls = { pendente: 'st-pendente', em_andamento: 'st-ativo', pausado: 'st-pausado', concluido: 'st-concluido' };
        var statusTxt = statusMap[prog.status] || 'Não iniciado';
        var statusC   = statusCls[prog.status] || 'st-pendente';

        // Info do exercício pausado
        var infoPausado = '';
        if ((prog.status === 'pausado' || prog.status === 'em_andamento') && r.exercicios[prog.indexAtual]) {
            var exNome = r.exercicios[prog.indexAtual].nome;
            var tempoTxt = '';
            if (prog.tempoRestante > 0) {
                var m = String(Math.floor(prog.tempoRestante / 60)).padStart(2, '0');
                var s = String(prog.tempoRestante % 60).padStart(2, '0');
                tempoTxt = ' — ' + m + ':' + s + ' restante';
            }
            infoPausado = '<div class="hist-proximo"><i class="fa-solid fa-stopwatch"></i> ' + exNome + tempoTxt + '</div>';
        }

        var btnContinuar = (prog.status === 'pausado' || prog.status === 'em_andamento')
            ? '<button class="hist-continuar" onclick="continuarTreino(' + r.id + ')"><i class="fa-solid fa-play"></i> Continuar treino</button>'
            : '';

        return '<div class="hist-card" data-testid="hist-card-' + r.id + '">' +
            '<button class="hist-del" onclick="removerHist(' + r.id + ')" title="Remover"><i class="fa-solid fa-xmark"></i></button>' +
            '<div class="hist-date">' + data + ' · ' + hora + '</div>' +
            '<div class="hist-meta">' + r.nivel.toUpperCase() + ' · ' + totalEx + ' EXERCÍCIOS</div>' +
            '<div class="hist-tags">' +
                '<span class="hist-tag">' + r.nivel + '</span>' +
                '<span class="hist-tag cyan">' + objetivoLabel + '</span>' +
                '<span class="hist-tag ' + statusC + '">' + statusTxt + '</span>' +
            '</div>' +
            '<div class="prog-wrap">' +
                '<div class="prog-bar"><div class="prog-fill" style="width:' + pct + '%"></div></div>' +
                '<span class="prog-txt">' + feitos + '/' + totalEx + ' exercícios</span>' +
            '</div>' +
            infoPausado +
            btnContinuar +
            '<button class="hist-replay" onclick="reaplicarRotina(' + r.id + ')">' +
                '<i class="fa-solid fa-rotate-right"></i> Refazer do zero' +
            '</button>' +
        '</div>';
    }).join('');
}

// ---------- CONTINUAR TREINO ----------
function continuarTreino(id) {
    var rotina = lerHistorico().find(function (r) { return r.id === id; });
    if (!rotina) return;

    treinoAtivo.rotina        = rotina;
    treinoAtivo.concluidos    = rotina.progresso.concluidos.slice();
    treinoAtivo.indexAtual    = rotina.progresso.indexAtual;
    treinoAtivo.tempoRestante = rotina.progresso.tempoRestante;

    document.getElementById('NivelSelect').value    = rotina.nivel;
    document.getElementById('ObjetivoSelect').value = rotina.objetivo;

    renderExercicios(rotina.exercicios, treinoAtivo.concluidos, treinoAtivo.indexAtual);
    renderAlimentos(rotina.alimentos);

    document.getElementById('resultado').classList.add('show');
    abrirAba('gerador');

    setTimeout(function () {
        var ex = rotina.exercicios[treinoAtivo.indexAtual];
        if (ex) {
            abrirTimerComProgresso(ex, treinoAtivo.indexAtual, treinoAtivo.tempoRestante);
        }
        document.getElementById('resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
}

function reaplicarRotina(id) {
    var rotina = lerHistorico().find(function (r) { return r.id === id; });
    if (!rotina) return;
    document.getElementById('NivelSelect').value    = rotina.nivel;
    document.getElementById('ObjetivoSelect').value = rotina.objetivo;
    abrirAba('gerador');
    setTimeout(function () { gerarRotina(); }, 400);
}

function removerHist(id) {
    var lista = lerHistorico().filter(function (r) { return r.id !== id; });
    localStorage.setItem(HIST_KEY, JSON.stringify(lista));
    renderHistorico();
    renderHistStats();
}

function limparHistorico() {
    if (!lerHistorico().length) return;
    if (confirm('Tem certeza que deseja apagar todo o histórico?')) {
        localStorage.removeItem(HIST_KEY);
        renderHistorico();
        renderHistStats();
    }
}

// ---------- MÚSICA ----------
function toggleMusica() {
    var musica = document.getElementById('musica');
    var btn    = document.getElementById('musicBtn');
    var icon   = document.getElementById('musicIcon');
    var label  = document.getElementById('musicLabel');

    if (musica.paused) {
        var playPromise = musica.play();
        if (playPromise && playPromise.catch) {
            playPromise.catch(function () { alert('Adicione um arquivo musica.mp3 na pasta para tocar.'); });
        }
        icon.className    = 'fa-solid fa-pause';
        label.textContent = 'Pausar';
        btn.classList.add('playing');
    } else {
        musica.pause();
        icon.className    = 'fa-solid fa-play';
        label.textContent = 'Tocar';
        btn.classList.remove('playing');
    }
}

// ---------- TIMER ----------
var timerInterval   = null;
var timerRemaining  = 0;
var timerInitial    = 0;
var timerRunning    = false;
var timerIndexAtual = -1;

function parseDuracao(d) {
    if (!d) return 60;
    var lower    = d.toLowerCase();
    var minutos  = lower.match(/(\d+)\s*minuto/);
    if (minutos) return parseInt(minutos[1], 10) * 60;
    var segundos = lower.match(/(\d+)s/);
    if (segundos) return parseInt(segundos[1], 10);
    return 45;
}

function abrirTimerComProgresso(ex, index, tempoSalvo) {
    // Remove botão de concluir anterior se existir
    var btnAnt = document.getElementById('btnConcluirEx');
    if (btnAnt) btnAnt.remove();

    timerIndexAtual = (typeof index !== 'undefined') ? index : -1;
    timerInitial    = parseDuracao(ex.duracao);
    timerRemaining  = (tempoSalvo && tempoSalvo > 0) ? tempoSalvo : timerInitial;

    document.getElementById('timerExercicio').textContent = ex.nome;
    document.getElementById('timerMeta').textContent      = ex.duracao + ' · ' + ex.tipo;

    if (timerIndexAtual !== -1 && treinoAtivo.rotina) {
        treinoAtivo.indexAtual     = timerIndexAtual;
        treinoAtivo.exercicioAtual = ex;
        salvarProgresso('em_andamento', timerRemaining);
        renderExercicios(treinoAtivo.rotina.exercicios, treinoAtivo.concluidos, timerIndexAtual);
    }

    atualizarDisplay();
    document.getElementById('timerOverlay').classList.add('show');
    setTimerBtn(false);

    // Mostra botão manual de concluir
    mostrarBotaoConcluir(timerIndexAtual);
}

function abrirTimer(ex) {
    abrirTimerComProgresso(ex, -1, 0);
}

function fecharTimer() {
    if (timerRunning) pauseTimer();
    if (timerIndexAtual !== -1) salvarProgresso('pausado', timerRemaining);
    document.getElementById('timerOverlay').classList.remove('show');
}

function atualizarDisplay() {
    var m       = String(Math.floor(timerRemaining / 60)).padStart(2, '0');
    var s       = String(timerRemaining % 60).padStart(2, '0');
    var display = document.getElementById('timerDisplay');
    display.textContent = m + ':' + s;
    if (timerRemaining <= 5 && timerRunning) display.classList.add('urgent');
    else display.classList.remove('urgent');
}

function toggleTimer() {
    if (timerRunning) pauseTimer();
    else startTimer();
}

function startTimer() {
    if (timerRemaining <= 0) timerRemaining = timerInitial;
    timerRunning = true;
    setTimerBtn(true);
    if (timerIndexAtual !== -1) salvarProgresso('em_andamento', timerRemaining);

    timerInterval = setInterval(function () {
        timerRemaining--;
        atualizarDisplay();

        if (timerRemaining % 5 === 0 && timerIndexAtual !== -1) {
            salvarProgresso('em_andamento', timerRemaining);
        }

        if (timerRemaining <= 0) {
            pauseTimer();
            beep();
            document.getElementById('timerDisplay').textContent = '00:00';
            if (timerIndexAtual !== -1) {
                marcarExercicioConcluido(timerIndexAtual);
                // Atualiza o meta para mostrar concluído
                var meta = document.getElementById('timerMeta');
                if (meta) meta.innerHTML = '<span style="color:var(--accent)"><i class="fa-solid fa-circle-check"></i> EXERCÍCIO CONCLUÍDO!</span>';
                // Remove botão manual se ainda estiver lá
                var btnAnt = document.getElementById('btnConcluirEx');
                if (btnAnt) btnAnt.remove();
            }
        }
    }, 1000);
}

function pauseTimer() {
    timerRunning = false;
    if (timerInterval) clearInterval(timerInterval);
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
    var btn = document.getElementById('timerStartBtn');
    if (!btn) return;
    btn.innerHTML = running
        ? '<i class="fa-solid fa-pause"></i> Pausar'
        : '<i class="fa-solid fa-play"></i> Iniciar';
}

function mostrarBotaoConcluir(index) {
    if (index === -1) return;
    var jaExiste = document.getElementById('btnConcluirEx');
    if (jaExiste) return;

    var btn = document.createElement('button');
    btn.id        = 'btnConcluirEx';
    btn.className = 'btn-apply';
    btn.style.cssText = 'margin-top:16px;width:100%;justify-content:center;border-radius:var(--radius);';
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Marcar como feito';
    btn.onclick = function () {
        marcarExercicioConcluido(index);
        fecharTimer();
    };

    var controls = document.querySelector('.timer-controls');
    if (controls) controls.insertAdjacentElement('afterend', btn);
}

function beep() {
    try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var o   = ctx.createOscillator();
        var g   = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(880, ctx.currentTime);
        g.gain.setValueAtTime(0.25, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        o.start();
        o.stop(ctx.currentTime + 0.6);
    } catch (e) { /* ignore */ }
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', function () {
    renderHistorico();
    renderHistStats();
});

