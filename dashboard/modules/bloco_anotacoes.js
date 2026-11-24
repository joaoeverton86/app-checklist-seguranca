/* Bloco de Anotações do painel: drawer lateral, cache local e espelho em configuracoes_sistema. */
(function () {
    'use strict';

    var CHAVE_EQUIPE = 'bloco_notas_equipe_sst';
    var CHAVE_ANONIMO = 'bloco_notas_anonimo_local';
    var PREFIXO_USUARIO = 'bloco_notas_user_';
    var AUTOSAVE_MS = 700;
    var LIMITE_NOTAS = 400;
    var TEXTOS = {
        salvando: 'Salvando...',
        nuvem: 'Salvo na nuvem',
        local: 'Salvo localmente',
        falha: 'Falha na nuvem - salvo localmente',
        'falha-sync': 'Falha ao sincronizar — salvo localmente',
        'local-anonimo': 'Salvo localmente'
    };
    var ETIQUETAS = [
        { nome: 'Geral', cor: 'azul' },
        { nome: 'Urgente', cor: 'vermelho' },
        { nome: 'Reunião', cor: 'roxo' },
        { nome: 'Campo', cor: 'verde' },
        { nome: 'Pendência', cor: 'ambar' },
        { nome: 'Ideia', cor: 'ciano' }
    ];
    var CORES = { azul: 1, vermelho: 1, roxo: 1, verde: 1, ambar: 1, ciano: 1 };

    function escaparHtml(valor) {
        return String(valor == null ? '' : valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function textoLimpo(valor, max) {
        return String(valor == null ? '' : valor).replace(/\u0000/g, '').slice(0, max);
    }

    function timestampMs(iso) {
        var t = Date.parse(iso || '');
        return Number.isFinite(t) ? t : 0;
    }

    function isoDe(valor) {
        var ms = timestampMs(valor);
        if (!ms) return '';
        return new Date(ms).toISOString();
    }

    function slugSeguro(texto) {
        var base = String(texto || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 48);
        return base || 'usuario';
    }

    function hashFnv1a(texto) {
        var h = 0x811c9dc5;
        var s = String(texto == null ? '' : texto);
        var i;
        for (i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return (h >>> 0).toString(16).padStart(8, '0');
    }

    function chaveUsuarioDe(bruto) {
        var original = String(bruto || '').trim();
        var slug = slugSeguro(original);
        var hash = hashFnv1a(original);
        var chave = PREFIXO_USUARIO + slug + '_' + hash;
        if (chave === CHAVE_EQUIPE || chave === CHAVE_ANONIMO) chave = PREFIXO_USUARIO + slug + '_user_' + hash;
        return { slug: slug, chaveMinhas: chave };
    }

    function identificadorBruto(sessao, nome) {
        var s = sessao && typeof sessao === 'object' ? sessao : null;
        if (s) {
            var uid = String(s.auth_user_id || s.uid || s.user_id || '').trim();
            if (uid) return 'uid_' + uid;
            var email = String(s.email || '').trim().toLowerCase();
            if (email.indexOf('@') > 0) return 'mail_' + email;
            var matricula = String(s.matricula || '').trim();
            if (matricula) return 'm_' + matricula;
            var tipo = String(s.tipo || '').trim();
            var nomeSessao = String(s.nome || '').trim();
            if (!nomeSessao && nome) nomeSessao = String(nome).trim();
            if (tipo === 'painel_externo' && nomeSessao) return 'ext_' + nomeSessao;
            if (nomeSessao) return 'n_' + nomeSessao;
            return '';
        }
        var nomeSolto = String(nome || '').trim();
        if (nomeSolto) return 'n_' + nomeSolto;
        return '';
    }

    function idValido(id) {
        return /^nota_[a-z0-9][a-z0-9_]{3,60}$/i.test(String(id || ''));
    }

    function novoId(agoraIso) {
        var ms = timestampMs(agoraIso) || Date.now();
        var rnd = Math.floor(Math.random() * 2176782336).toString(36);
        var id = ('nota_' + ms.toString(36) + '_' + rnd).replace(/[^a-z0-9_]/g, '').slice(0, 48);
        if (!idValido(id)) id = 'nota_x' + ms.toString(36) + rnd;
        return id;
    }

    function normalizarBusca(valor) {
        return String(valor || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    function etiquetaPorNome(nome) {
        var alvo = String(nome || '').trim().toLowerCase();
        var i;
        for (i = 0; i < ETIQUETAS.length; i++) {
            if (ETIQUETAS[i].nome.toLowerCase() === alvo) return ETIQUETAS[i];
        }
        return ETIQUETAS[0];
    }

    function classeCor(cor) {
        return CORES[cor] ? 'db-bloco-cor-' + cor : 'db-bloco-cor-azul';
    }

    function resolverIdentidade(entrada) {
        var dados = entrada || {};
        var sessao = dados.sessao && typeof dados.sessao === 'object' ? dados.sessao : null;
        var nome = sessao ? String(sessao.nome || '').trim() : '';
        var matricula = sessao ? String(sessao.matricula || '').trim() : '';
        if (!nome && dados.nome) nome = String(dados.nome).trim();
        var bruto = identificadorBruto(sessao, nome);
        if (!bruto) {
            return {
                identificado: false,
                rotulo: 'Não identificado',
                slug: 'anonimo',
                chaveMinhas: CHAVE_ANONIMO
            };
        }
        var chave = chaveUsuarioDe(bruto);
        return {
            identificado: true,
            rotulo: nome || matricula || 'Usuário',
            slug: chave.slug,
            chaveMinhas: chave.chaveMinhas
        };
    }

    function obterIdentidadeDoPainel() {
        var sessao = null;
        var nome = '';
        try {
            if (typeof window.sessaoDashboardAtual === 'function') sessao = window.sessaoDashboardAtual();
        } catch (e) {
            sessao = null;
        }
        try {
            if (typeof window.usuarioDashboardAtual === 'function') nome = window.usuarioDashboardAtual() || '';
        } catch (e2) {
            nome = '';
        }
        if (sessao && typeof sessao === 'object' && !sessao.nome && nome) {
            sessao = {
                matricula: sessao.matricula,
                nome: nome,
                tipo: sessao.tipo,
                role: sessao.role,
                email: sessao.email,
                auth_user_id: sessao.auth_user_id,
                uid: sessao.uid,
                user_id: sessao.user_id
            };
        }
        return resolverIdentidade({ sessao: sessao, nome: nome });
    }

    function chaveArmazenamento(ident, escopo) {
        if (escopo === 'equipe') return CHAVE_EQUIPE;
        if (!ident || !ident.identificado) return CHAVE_ANONIMO;
        return ident.chaveMinhas || chaveUsuarioDe(ident.slug || 'usuario').chaveMinhas;
    }

    function podeSincronizarNuvem(ident) {
        return !!(ident && ident.identificado);
    }

    function podeGravarEscopo(ident, escopo) {
        if (!ident) return false;
        if (escopo === 'equipe') return !!ident.identificado;
        return escopo === 'minhas';
    }

    function criarEstadoVazio() {
        return { versao: 1, atualizado_em: '', notas: [], excluidas: {} };
    }

    function normalizarNota(item) {
        if (!item || typeof item !== 'object') return null;
        if (!idValido(item.id)) return null;
        var et = etiquetaPorNome(item.etiqueta);
        var criado = isoDe(item.criado_em) || isoDe(item.atualizado_em);
        var atualizado = isoDe(item.atualizado_em) || criado;
        return {
            id: String(item.id),
            titulo: textoLimpo(item.titulo, 160),
            conteudo: textoLimpo(item.conteudo, 20000),
            etiqueta: et.nome,
            cor: et.cor,
            fixada: item.fixada === true || item.fixada === 1 || item.fixada === 'true',
            criado_em: criado,
            atualizado_em: atualizado,
            autor: textoLimpo(item.autor, 120),
            atualizado_por: textoLimpo(item.atualizado_por || item.autor, 120)
        };
    }

    function normalizarExcluidas(mapa) {
        var saida = {};
        if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return saida;
        Object.keys(mapa).forEach(function (id) {
            if (!idValido(id)) return;
            var iso = isoDe(mapa[id]);
            if (iso) saida[id] = iso;
        });
        return saida;
    }

    function normalizarEstado(entrada) {
        var bruto = entrada && typeof entrada === 'object' && !Array.isArray(entrada) ? entrada : {};
        var notas = [];
        var vistos = {};
        var lista = Array.isArray(bruto.notas) ? bruto.notas : [];
        lista.forEach(function (item) {
            var nota = normalizarNota(item);
            if (!nota || vistos[nota.id]) return;
            vistos[nota.id] = true;
            notas.push(nota);
        });
        return {
            versao: 1,
            atualizado_em: isoDe(bruto.atualizado_em),
            notas: notas,
            excluidas: normalizarExcluidas(bruto.excluidas)
        };
    }

    function analisarValor(valor) {
        if (valor == null || valor === '') return criarEstadoVazio();
        var dados = valor;
        var profundidade = 0;
        while (typeof dados === 'string' && profundidade < 2) {
            try {
                dados = JSON.parse(dados);
            } catch (e) {
                return criarEstadoVazio();
            }
            profundidade += 1;
        }
        if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return criarEstadoVazio();
        return normalizarEstado(dados);
    }

    function serializarValor(estado) {
        var e = normalizarEstado(estado);
        return JSON.stringify({
            versao: 1,
            atualizado_em: e.atualizado_em,
            notas: e.notas,
            excluidas: e.excluidas
        });
    }

    function normalizarCampos(campos) {
        var fonte = campos || {};
        var conteudo = textoLimpo(fonte.conteudo, 20000).replace(/\r\n/g, '\n');
        var titulo = textoLimpo(fonte.titulo, 160).trim();
        if (!titulo && !String(conteudo).trim()) return { vazio: true };
        var et = etiquetaPorNome(fonte.etiqueta);
        return {
            vazio: false,
            titulo: titulo || 'Nota sem título',
            conteudo: conteudo,
            etiqueta: et.nome,
            cor: et.cor,
            fixada: fonte.fixada === true || fonte.fixada === 1 || fonte.fixada === 'true'
        };
    }

    function iniciarEdicao(estado, notaId) {
        var snapshot = normalizarEstado(estado);
        var nota = null;
        snapshot.notas.forEach(function (item) {
            if (item.id === notaId) nota = item;
        });
        if (!nota) return null;
        return {
            novo: false,
            notaId: nota.id,
            snapshot: snapshot,
            rascunho: normalizarNota(nota)
        };
    }

    function confirmarEdicao(estado, sessao, campos, agoraIso, autor) {
        var base = normalizarEstado(sessao && sessao.snapshot ? sessao.snapshot : estado);
        var norm = normalizarCampos(campos);
        var quando = isoDe(agoraIso) || new Date().toISOString();
        var quem = textoLimpo(autor, 120) || 'Não identificado';
        if (norm.vazio) return { estado: base, nota: null, descartado: true, motivo: 'vazia' };
        if (!sessao || sessao.novo) {
            if (base.notas.length >= LIMITE_NOTAS) {
                return { estado: base, nota: null, descartado: true, motivo: 'limite' };
            }
            var id = novoId(quando);
            if (campos && idValido(campos.id)) id = String(campos.id);
            else if (sessao && idValido(sessao.notaId)) id = sessao.notaId;
            var nova = {
                id: id,
                titulo: norm.titulo,
                conteudo: norm.conteudo,
                etiqueta: norm.etiqueta,
                cor: norm.cor,
                fixada: norm.fixada,
                criado_em: quando,
                atualizado_em: quando,
                autor: quem,
                atualizado_por: quem
            };
            base.notas.push(nova);
            if (base.excluidas[id]) delete base.excluidas[id];
            base.atualizado_em = quando;
            return { estado: normalizarEstado(base), nota: normalizarNota(nova), descartado: false };
        }
        var idx = -1;
        base.notas.forEach(function (item, i) {
            if (item.id === sessao.notaId) idx = i;
        });
        if (idx < 0) return { estado: base, nota: null, descartado: true, motivo: 'nao-encontrada' };
        var anterior = base.notas[idx];
        var editada = {
            id: anterior.id,
            titulo: norm.titulo,
            conteudo: norm.conteudo,
            etiqueta: norm.etiqueta,
            cor: norm.cor,
            fixada: norm.fixada,
            criado_em: anterior.criado_em || quando,
            atualizado_em: quando,
            autor: anterior.autor || quem,
            atualizado_por: quem
        };
        base.notas[idx] = editada;
        if (base.excluidas[editada.id]) delete base.excluidas[editada.id];
        base.atualizado_em = quando;
        return { estado: normalizarEstado(base), nota: normalizarNota(editada), descartado: false };
    }

    function criarNota(estado, campos, agoraIso, autor) {
        return confirmarEdicao(estado, {
            novo: true,
            notaId: campos && campos.id,
            snapshot: normalizarEstado(estado),
            rascunho: {}
        }, campos || {}, agoraIso, autor);
    }

    function cancelarEdicao(sessao) {
        if (!sessao || !sessao.snapshot) return criarEstadoVazio();
        return normalizarEstado(sessao.snapshot);
    }

    function excluirNota(estado, id, agoraIso) {
        var base = normalizarEstado(estado);
        if (!idValido(id)) return base;
        var quando = isoDe(agoraIso) || new Date().toISOString();
        base.notas = base.notas.filter(function (nota) { return nota.id !== id; });
        base.excluidas[id] = quando;
        base.atualizado_em = quando;
        return base;
    }

    function alternarFixacao(estado, id, agoraIso, autor) {
        var base = normalizarEstado(estado);
        var quando = isoDe(agoraIso) || new Date().toISOString();
        var quem = textoLimpo(autor, 120);
        var i;
        for (i = 0; i < base.notas.length; i++) {
            if (base.notas[i].id !== id) continue;
            base.notas[i].fixada = !base.notas[i].fixada;
            base.notas[i].atualizado_em = quando;
            if (quem) base.notas[i].atualizado_por = quem;
            base.atualizado_em = quando;
            break;
        }
        return base;
    }

    function ordenarNotas(notas) {
        return (Array.isArray(notas) ? notas.slice() : []).sort(function (a, b) {
            var fa = a && a.fixada ? 1 : 0;
            var fb = b && b.fixada ? 1 : 0;
            if (fa !== fb) return fb - fa;
            var diff = timestampMs(b && b.atualizado_em) - timestampMs(a && a.atualizado_em);
            if (diff !== 0) return diff;
            var ia = String(a && a.id || '');
            var ib = String(b && b.id || '');
            if (ia < ib) return -1;
            if (ia > ib) return 1;
            return 0;
        });
    }

    function filtrarNotas(notas, filtro) {
        var f = filtro || {};
        var q = normalizarBusca(f.busca);
        var lista = Array.isArray(notas) ? notas : [];
        return ordenarNotas(lista.filter(function (nota) {
            if (!nota) return false;
            if (f.somenteFixadas && !nota.fixada) return false;
            if (f.etiqueta && nota.etiqueta !== f.etiqueta) return false;
            if (!q) return true;
            var alvo = normalizarBusca([nota.titulo, nota.conteudo, nota.etiqueta].join('\n'));
            return alvo.indexOf(q) !== -1;
        }));
    }

    function canonico(estado) {
        var e = normalizarEstado(estado);
        var notas = e.notas.slice().sort(function (a, b) {
            if (a.id < b.id) return -1;
            if (a.id > b.id) return 1;
            return 0;
        });
        var excluidas = {};
        Object.keys(e.excluidas).sort().forEach(function (id) {
            excluidas[id] = e.excluidas[id];
        });
        return JSON.stringify({ notas: notas, excluidas: excluidas });
    }

    function mesclarPayloads(local, remoto) {
        var A = normalizarEstado(analisarSePreciso(local));
        var B = normalizarEstado(analisarSePreciso(remoto));
        var notas = {};
        function considerar(nota) {
            if (!nota) return;
            var atual = notas[nota.id];
            if (!atual || timestampMs(nota.atualizado_em) > timestampMs(atual.atualizado_em)) {
                notas[nota.id] = normalizarNota(nota);
            }
        }
        A.notas.forEach(considerar);
        B.notas.forEach(considerar);
        var excluidas = {};
        function considerarTombe(id, iso) {
            if (!excluidas[id] || timestampMs(iso) > timestampMs(excluidas[id])) excluidas[id] = iso;
        }
        Object.keys(A.excluidas).forEach(function (id) { considerarTombe(id, A.excluidas[id]); });
        Object.keys(B.excluidas).forEach(function (id) { considerarTombe(id, B.excluidas[id]); });
        var finais = [];
        Object.keys(notas).forEach(function (id) {
            var nota = notas[id];
            var tombe = excluidas[id];
            if (tombe && timestampMs(tombe) >= timestampMs(nota.atualizado_em)) return;
            if (tombe && timestampMs(tombe) < timestampMs(nota.atualizado_em)) delete excluidas[id];
            finais.push(nota);
        });
        var atualizadoA = timestampMs(A.atualizado_em);
        var atualizadoB = timestampMs(B.atualizado_em);
        return {
            versao: 1,
            atualizado_em: atualizadoA >= atualizadoB ? (A.atualizado_em || B.atualizado_em || '') : (B.atualizado_em || ''),
            notas: ordenarNotas(finais),
            excluidas: excluidas
        };
    }

    function analisarSePreciso(valor) {
        if (typeof valor === 'string') return analisarValor(valor);
        return valor;
    }

    function formatarDataHora(iso) {
        var ms = timestampMs(iso);
        if (!ms) return '';
        try {
            return new Date(ms).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return new Date(ms).toISOString();
        }
    }

    function textoAuditoria(nota) {
        var segura = normalizarNota(nota) || nota || {};
        var quando = formatarDataHora(segura.atualizado_em);
        var autor = segura.autor || 'Não identificado';
        var por = segura.atualizado_por || autor;
        if (por && por !== autor) return 'Criada por ' + autor + ' · Atualizada por ' + por + ' em ' + quando;
        return 'Criada por ' + autor + ' · Atualizada em ' + quando;
    }

    function renderizarFiltros(filtroAtivo) {
        function chip(valor, rotulo) {
            var ativo = filtroAtivo === valor;
            return '<button type="button" class="db-bloco-chip' + (ativo ? ' is-active' : '') + '" data-action="filtro" data-filtro="' + escaparHtml(valor) + '" aria-pressed="' + (ativo ? 'true' : 'false') + '">' + escaparHtml(rotulo) + '</button>';
        }
        var html = chip('todas', 'Todas') + chip('fixadas', 'Fixadas');
        ETIQUETAS.forEach(function (et) {
            html += chip(et.nome, et.nome);
        });
        return html;
    }

    function htmlCartao(nota, opts) {
        var meta = opts.escopo === 'equipe'
            ? textoAuditoria(nota)
            : ('Atualizada em ' + formatarDataHora(nota.atualizado_em));
        var resumo = String(nota.conteudo || '').replace(/\s+/g, ' ').trim();
        if (resumo.length > 160) resumo = resumo.slice(0, 157) + '...';
        var acoes = '';
        if (!opts.somenteLeitura) {
            if (opts.confirmandoId === nota.id) {
                acoes = '<div class="db-bloco-confirma" role="group" aria-label="Confirmar exclusão">' +
                    '<p>Excluir esta nota? Ela sai da lista deste bloco.</p>' +
                    '<button type="button" class="db-bloco-btn perigo" data-action="confirmar-excluir" data-nota-id="' + escaparHtml(nota.id) + '">Excluir</button>' +
                    '<button type="button" class="db-bloco-btn" data-action="cancelar-excluir">Manter</button>' +
                    '</div>';
            } else {
                acoes = '<div class="db-bloco-card-acoes">' +
                    '<button type="button" class="db-bloco-btn" data-action="editar" data-nota-id="' + escaparHtml(nota.id) + '">Editar</button>' +
                    '<button type="button" class="db-bloco-btn" data-action="fixar" data-nota-id="' + escaparHtml(nota.id) + '" aria-pressed="' + (nota.fixada ? 'true' : 'false') + '">' + (nota.fixada ? 'Desafixar' : 'Fixar') + '</button>' +
                    '<button type="button" class="db-bloco-btn perigo" data-action="excluir" data-nota-id="' + escaparHtml(nota.id) + '">Excluir</button>' +
                    '</div>';
            }
        }
        return '<article class="db-bloco-card ' + classeCor(nota.cor) + (nota.fixada ? ' is-fixada' : '') + '" data-nota-id="' + escaparHtml(nota.id) + '">' +
            '<div class="db-bloco-card-topo">' +
            '<h3>' + (nota.fixada ? '<span class="db-bloco-pin" aria-hidden="true">📌</span> ' : '') + escaparHtml(nota.titulo) + '</h3>' +
            '<span class="db-bloco-tag ' + classeCor(nota.cor) + '">' + escaparHtml(nota.etiqueta) + '</span>' +
            '</div>' +
            (resumo ? '<p class="db-bloco-resumo">' + escaparHtml(resumo) + '</p>' : '') +
            '<p class="db-bloco-meta">' + escaparHtml(meta) + '</p>' +
            acoes +
            '</article>';
    }

    function renderizarLista(notas, opcoes) {
        var opts = opcoes || {};
        var visiveis = [];
        (Array.isArray(notas) ? notas : []).forEach(function (item) {
            var nota = normalizarNota(item);
            if (nota) visiveis.push(nota);
        });
        if (!visiveis.length) {
            return '<div class="db-bloco-vazio">' + escaparHtml(opts.mensagemVazia || 'Nenhuma nota ainda.') + '</div>';
        }
        var html = '';
        if (opts.somenteLeitura) {
            html += '<p class="db-bloco-aviso-equipe">O bloco da equipe só pode ser alterado com um usuário identificado.</p>';
        }
        visiveis.forEach(function (nota) { html += htmlCartao(nota, opts); });
        return html;
    }

    function renderizarEditor(rascunho) {
        var nota = rascunho || {};
        var etAtual = etiquetaPorNome(nota.etiqueta);
        var tags = '';
        ETIQUETAS.forEach(function (et) {
            var ativo = et.nome === etAtual.nome;
            tags += '<button type="button" class="db-bloco-tag ' + classeCor(et.cor) + (ativo ? ' is-active' : '') + '" data-action="etiqueta" data-etiqueta="' + escaparHtml(et.nome) + '" aria-pressed="' + (ativo ? 'true' : 'false') + '">' + escaparHtml(et.nome) + '</button>';
        });
        return '<form class="db-bloco-editor" data-action="form-editor">' +
            '<label class="db-bloco-campo"><span>Título</span>' +
            '<input type="text" id="blocoNotaTitulo" maxlength="160" value="' + escaparHtml(nota.titulo || '') + '" placeholder="Título da nota" autocomplete="off">' +
            '</label>' +
            '<div class="db-bloco-editor-tags"><span>Etiqueta</span><div>' + tags + '</div></div>' +
            '<button type="button" class="db-bloco-btn" id="blocoNotaFixar" data-action="fixar-rascunho" aria-pressed="' + (nota.fixada ? 'true' : 'false') + '">' + (nota.fixada ? 'Desafixar' : 'Fixar no topo') + '</button>' +
            '<label class="db-bloco-campo"><span>Conteúdo</span>' +
            '<textarea id="blocoNotaConteudo" maxlength="20000" rows="12" placeholder="Escreva o recado, a pendência ou a ideia...">' + escaparHtml(nota.conteudo || '') + '</textarea>' +
            '</label>' +
            '<p id="blocoNotaValidacao" class="db-bloco-validacao"></p>' +
            '<p class="db-bloco-dica">A nota também é salva sozinha depois de uma pausa curta.</p>' +
            '<div class="db-bloco-editor-acoes">' +
            '<button type="button" class="db-bloco-btn primario" data-action="salvar">Salvar</button>' +
            '<button type="button" class="db-bloco-btn" data-action="voltar">Voltar</button>' +
            '</div></form>';
    }

    function criarControlador(opcoes) {
        var deps = opcoes || {};
        var storage = deps.storage;
        var getIdentidade = typeof deps.getIdentidade === 'function' ? deps.getIdentidade : obterIdentidadeDoPainel;
        var supabaseFetch = deps.supabaseFetch;
        var supabaseUpsert = deps.supabaseUpsert;
        var agora = typeof deps.agora === 'function' ? deps.agora : function () { return new Date().toISOString(); };
        var memoria = { minhas: null, equipe: null };
        var tokens = { minhas: 0, equipe: 0 };
        var filas = { minhas: Promise.resolve(), equipe: Promise.resolve() };
        var chaveVista = null;

        function comFila(escopo, fn) {
            var alvo = escopo === 'equipe' ? 'equipe' : 'minhas';
            var anterior = filas[alvo] || Promise.resolve();
            var resultado = anterior.then(function () { return fn(); });
            filas[alvo] = resultado.then(function () { return null; }, function () { return null; });
            return resultado;
        }

        function identAtual() {
            try {
                return getIdentidade() || resolverIdentidade(null);
            } catch (e) {
                return resolverIdentidade(null);
            }
        }

        function statusDe(ident) {
            return ident && ident.identificado ? 'local' : 'local-anonimo';
        }

        function ler(chave) {
            try {
                if (!storage || typeof storage.getItem !== 'function') return criarEstadoVazio();
                return analisarValor(storage.getItem(chave));
            } catch (e) {
                return criarEstadoVazio();
            }
        }

        function adotarMinhas() {
            var ident = identAtual();
            var chave = chaveArmazenamento(ident, 'minhas');
            var diferente = !!(memoria.minhas && memoria.minhas.chave !== chave);
            if (!memoria.minhas || diferente) {
                if (diferente) tokens.minhas += 1;
                memoria.minhas = { chave: chave, estado: ler(chave), status: statusDe(ident) };
            }
            var primeira = chaveVista === null;
            var mudou = !primeira && (chaveVista !== chave || diferente);
            chaveVista = chave;
            return mudou;
        }

        function garantir(escopo) {
            if (escopo === 'minhas') {
                var mudou = adotarMinhas();
                return { mudou: mudou, chave: memoria.minhas.chave, ident: identAtual() };
            }
            var ident = identAtual();
            var chave = chaveArmazenamento(ident, 'equipe');
            if (!memoria.equipe || memoria.equipe.chave !== chave) {
                memoria.equipe = { chave: chave, estado: ler(chave), status: statusDe(ident) };
            }
            return { mudou: false, chave: chave, ident: ident };
        }

        function recusaTroca(escopo) {
            var info = garantir(escopo);
            if (escopo === 'minhas' && info.mudou) {
                return {
                    ok: false,
                    motivo: 'usuario-trocado',
                    status: memoria.minhas.status,
                    estado: normalizarEstado(memoria.minhas.estado),
                    nota: null
                };
            }
            return null;
        }

        function foto(escopo) {
            var item = memoria[escopo] || { chave: '', estado: criarEstadoVazio(), status: 'local' };
            return { chave: item.chave, status: item.status, estado: normalizarEstado(item.estado) };
        }

        function lembrar(escopo, chave, estado, status) {
            if (chaveArmazenamento(identAtual(), escopo) !== chave) return;
            var norm = normalizarEstado(estado);
            if (!memoria[escopo] || memoria[escopo].chave !== chave) {
                memoria[escopo] = { chave: chave, estado: norm, status: status };
                return;
            }
            memoria[escopo].estado = norm;
            memoria[escopo].status = status;
        }

        async function lerNuvem(chave) {
            if (typeof supabaseFetch !== 'function') return { ok: false };
            var rows;
            try {
                rows = await supabaseFetch('configuracoes_sistema', '?id=eq.' + encodeURIComponent(chave) + '&select=id,valor,atualizado_em');
            } catch (e) {
                return { ok: false };
            }
            if (!Array.isArray(rows)) return { ok: false };
            if (!rows.length || !rows[0]) return { ok: true, ausente: true, estado: criarEstadoVazio() };
            return { ok: true, ausente: false, estado: analisarValor(rows[0].valor) };
        }

        async function gravarUpsert(escopo, chave, estado, autor, ident) {
            var serial = serializarValor(estado);
            var norm = analisarValor(serial);
            try { storage.setItem(chave, serial); } catch (e) { /* o primeiro salvamento local já ocorreu */ }
            if (typeof supabaseUpsert !== 'function') throw new Error('supabaseUpsert indisponível');
            await supabaseUpsert('configuracoes_sistema', [{
                id: chave,
                valor: serial,
                descricao: escopo === 'equipe'
                    ? 'Bloco de anotações compartilhado da equipe de SST.'
                    : 'Bloco de anotações individual do usuário do painel.',
                atualizado_em: norm.atualizado_em || agora(),
                atualizado_por: textoLimpo(autor, 120) || (ident && ident.rotulo) || 'painel'
            }]);
            return norm;
        }

        // Consistência entre sessões: read-merge-write otimista em configuracoes_sistema,
        // sem mudança de schema nem RPC. A leitura prévia confirma ausência ou mescla o
        // remoto; se ela falhar, a nuvem não é sobrescrita. Após gravar, uma nova leitura
        // dispara no máximo um retry se outra sessão mudou notas ou tombstones.
        async function enviarReconciliado(escopo, estadoLocal, autor, chave, ident) {
            var leitura = await lerNuvem(chave);
            if (!leitura.ok) {
                lembrar(escopo, chave, estadoLocal, 'falha-sync');
                return { ok: true, status: 'falha-sync', local: true, estado: normalizarEstado(estadoLocal) };
            }
            var base = normalizarEstado(estadoLocal);
            var mesclado = leitura.ausente ? base : mesclarPayloads(base, leitura.estado);
            lembrar(escopo, chave, mesclado, 'salvando');
            var gravado;
            try {
                gravado = await gravarUpsert(escopo, chave, mesclado, autor, ident);
            } catch (e) {
                lembrar(escopo, chave, mesclado, 'falha');
                return { ok: true, status: 'falha', local: true, estado: normalizarEstado(mesclado) };
            }
            try {
                var conferencia = await lerNuvem(chave);
                var divergiu = conferencia.ok && canonico(conferencia.estado) !== canonico(gravado);
                if (divergiu) {
                    var reparado = mesclarPayloads(mesclarPayloads(gravado, conferencia.estado), ler(chave));
                    gravado = await gravarUpsert(escopo, chave, reparado, autor, ident);
                }
            } catch (e2) {
                lembrar(escopo, chave, gravado, 'falha');
                return { ok: true, status: 'falha', local: true, estado: normalizarEstado(gravado) };
            }
            lembrar(escopo, chave, gravado, 'nuvem');
            return { ok: true, status: 'nuvem', estado: normalizarEstado(gravado) };
        }

        async function persistir(escopo, estado, autor, chave) {
            var ident = identAtual();
            if (!podeGravarEscopo(ident, escopo)) {
                return { ok: false, motivo: 'sem-permissao', status: 'local-anonimo', estado: normalizarEstado(estado) };
            }
            var serial;
            try {
                serial = serializarValor(estado);
                storage.setItem(chave, serial);
            } catch (e) {
                return { ok: false, motivo: 'local', status: 'falha', estado: normalizarEstado(estado) };
            }
            var gravado = analisarValor(serial);
            var mesmo = chaveArmazenamento(identAtual(), escopo) === chave;
            if (mesmo) memoria[escopo] = { chave: chave, estado: gravado, status: statusDe(ident) };
            if (!ident.identificado) {
                return { ok: true, status: 'local-anonimo', estado: gravado };
            }
            return enviarReconciliado(escopo, gravado, autor, chave, ident);
        }

        async function hidratar(escopo) {
            return comFila(escopo, function () { return hidratarDentro(escopo); });
        }

        async function hidratarDentro(escopo) {
            garantir(escopo);
            var ident = identAtual();
            var chave = chaveArmazenamento(ident, escopo);
            var meuToken = ++tokens[escopo];
            if (!memoria[escopo] || memoria[escopo].chave !== chave) {
                memoria[escopo] = { chave: chave, estado: ler(chave), status: statusDe(ident) };
            }
            if (!ident.identificado || typeof supabaseFetch !== 'function') {
                memoria[escopo].status = ident.identificado ? 'falha' : 'local-anonimo';
                return foto(escopo);
            }
            try {
                var rows = await supabaseFetch('configuracoes_sistema', '?id=eq.' + encodeURIComponent(chave));
                if (meuToken !== tokens[escopo]) return foto(escopo);
                if (chaveArmazenamento(identAtual(), escopo) !== chave) return foto(escopo);
                if (!Array.isArray(rows)) throw new Error('leitura invalida');
                var lista = rows;
                var remoto = lista[0] ? analisarValor(lista[0].valor) : criarEstadoVazio();
                var mesclado = mesclarPayloads(ler(chave), remoto);
                if (canonico(remoto) === canonico(mesclado)) {
                    try { storage.setItem(chave, serializarValor(mesclado)); } catch (e) { /* cache local opcional */ }
                    memoria[escopo] = { chave: chave, estado: mesclado, status: 'nuvem' };
                    return foto(escopo);
                }
                await persistir(escopo, mesclado, ident.rotulo, chave);
                if (meuToken !== tokens[escopo] || chaveArmazenamento(identAtual(), escopo) !== chave) return foto(escopo);
                return foto(escopo);
            } catch (e2) {
                if (meuToken === tokens[escopo] && memoria[escopo] && memoria[escopo].chave === chave) {
                    memoria[escopo].status = 'falha';
                }
                return foto(escopo);
            }
        }

        async function salvarCampos(escopo, notaId, campos) {
            return comFila(escopo, function () { return salvarCamposDentro(escopo, notaId, campos); });
        }

        async function salvarCamposDentro(escopo, notaId, campos) {
            var recusa = recusaTroca(escopo);
            if (recusa) return recusa;
            var ident = identAtual();
            if (!podeGravarEscopo(ident, escopo)) {
                return { ok: false, motivo: 'sem-permissao', status: memoria[escopo].status, estado: normalizarEstado(memoria[escopo].estado), nota: null };
            }
            var chave = memoria[escopo].chave;
            var quando = agora();
            var autor = ident.rotulo || 'Não identificado';
            var existente = notaId && memoria[escopo].estado.notas.some(function (nota) { return nota.id === notaId; });
            var resultado;
            if (existente) {
                resultado = confirmarEdicao(memoria[escopo].estado, iniciarEdicao(memoria[escopo].estado, notaId), campos, quando, autor);
            } else {
                var dados = Object.assign({}, campos || {});
                if (idValido(notaId)) dados.id = notaId;
                resultado = criarNota(memoria[escopo].estado, dados, quando, autor);
            }
            if (resultado.descartado) {
                return { ok: false, motivo: resultado.motivo || 'vazia', status: memoria[escopo].status, estado: normalizarEstado(memoria[escopo].estado), nota: null };
            }
            var gravacao = await persistir(escopo, resultado.estado, autor, chave);
            gravacao.nota = resultado.nota;
            if (!gravacao.estado) gravacao.estado = resultado.estado;
            return gravacao;
        }

        async function excluir(escopo, id) {
            return comFila(escopo, function () { return excluirDentro(escopo, id); });
        }

        async function excluirDentro(escopo, id) {
            var recusa = recusaTroca(escopo);
            if (recusa) return recusa;
            var ident = identAtual();
            if (!podeGravarEscopo(ident, escopo)) {
                return { ok: false, motivo: 'sem-permissao', status: 'local-anonimo', estado: normalizarEstado(memoria[escopo].estado) };
            }
            var proximo = excluirNota(memoria[escopo].estado, id, agora());
            return persistir(escopo, proximo, ident.rotulo, memoria[escopo].chave);
        }

        async function fixar(escopo, id) {
            return comFila(escopo, function () { return fixarDentro(escopo, id); });
        }

        async function fixarDentro(escopo, id) {
            var recusa = recusaTroca(escopo);
            if (recusa) return recusa;
            var ident = identAtual();
            if (!podeGravarEscopo(ident, escopo)) {
                return { ok: false, motivo: 'sem-permissao', status: 'local-anonimo', estado: normalizarEstado(memoria[escopo].estado) };
            }
            var proximo = alternarFixacao(memoria[escopo].estado, id, agora(), ident.rotulo);
            return persistir(escopo, proximo, ident.rotulo, memoria[escopo].chave);
        }

        return {
            hidratar: hidratar,
            salvarCampos: salvarCampos,
            excluir: excluir,
            alternarFixacao: fixar,
            estado: function (escopo) {
                garantir(escopo);
                return normalizarEstado(memoria[escopo].estado);
            },
            status: function (escopo) {
                garantir(escopo);
                return memoria[escopo].status;
            },
            chaveAtual: function (escopo) {
                return chaveArmazenamento(identAtual(), escopo === 'equipe' ? 'equipe' : 'minhas');
            },
            identidadeAtual: identAtual,
            aoTrocarUsuario: function () {
                if (chaveVista === null) {
                    adotarMinhas();
                    return false;
                }
                return adotarMinhas();
            }
        };
    }

    var controlador = null;
    var ui = { escopo: 'minhas', filtro: 'todas', busca: '' };
    var editor = null;
    var confirmandoId = null;
    var aberto = false;
    var interfacePronta = false;
    var timerSalvar = null;
    var salvandoAgora = false;
    var editorSessionToken = 0;
    var resavePendente = null;
    var chaveUi = null;
    var timerUsuario = null;

    function storageDoNavegador() {
        try {
            if (typeof window.localStorage === 'undefined' || !window.localStorage) return null;
            return window.localStorage;
        } catch (e) {
            return null;
        }
    }

    function storageMemoria() {
        var mapa = new Map();
        return {
            getItem: function (k) { return mapa.has(k) ? mapa.get(k) : null; },
            setItem: function (k, v) { mapa.set(String(k), String(v)); },
            removeItem: function (k) { mapa.delete(k); }
        };
    }

    function garantirControlador() {
        if (controlador) return controlador;
        controlador = criarControlador({
            storage: storageDoNavegador() || storageMemoria(),
            getIdentidade: obterIdentidadeDoPainel,
            supabaseFetch: function (tabela, consulta) {
                if (typeof window.supabaseFetch !== 'function') throw new Error('supabaseFetch indisponível');
                return window.supabaseFetch(tabela, consulta);
            },
            supabaseUpsert: function (tabela, linhas) {
                if (typeof window.supabaseUpsert !== 'function') throw new Error('supabaseUpsert indisponível');
                return window.supabaseUpsert(tabela, linhas);
            }
        });
        return controlador;
    }

    function el(id) {
        if (typeof document === 'undefined' || !document || typeof document.getElementById !== 'function') return null;
        return document.getElementById(id);
    }

    function aplicarStatus(codigo) {
        var status = el('blocoAnotacoesStatus');
        if (!status) return;
        var chave = TEXTOS[codigo] ? codigo : 'local';
        status.textContent = TEXTOS[chave];
        status.setAttribute('data-estado', chave);
    }

    function atualizarBadge() {
        var badge = el('badgeBlocoAnotacoesQtd');
        if (!badge) return;
        var ctrl = garantirControlador();
        var total = (ctrl.estado('minhas').notas || []).length;
        if (ctrl.identidadeAtual().identificado) total += (ctrl.estado('equipe').notas || []).length;
        if (!total) {
            badge.hidden = true;
            badge.textContent = '0';
            return;
        }
        badge.hidden = false;
        badge.textContent = total > 99 ? '99+' : String(total);
    }

    function notasDaTela() {
        var ctrl = garantirControlador();
        var filtro = { busca: ui.busca };
        if (ui.filtro === 'fixadas') filtro.somenteFixadas = true;
        else if (ui.filtro && ui.filtro !== 'todas') filtro.etiqueta = ui.filtro;
        return filtrarNotas(ctrl.estado(ui.escopo).notas, filtro);
    }

    function mensagemVazia() {
        if (ui.busca || (ui.filtro && ui.filtro !== 'todas')) return 'Nenhuma nota encontrada para essa busca ou filtro.';
        return 'Nenhuma nota ainda. Use Nova nota para guardar um recado.';
    }

    function renderChrome() {
        var ctrl = garantirControlador();
        var ident = ctrl.identidadeAtual();
        var aviso = el('blocoAnotacoesAvisoAnonimo');
        if (aviso) aviso.hidden = !!ident.identificado;
        var minhas = el('abaBlocoMinhas');
        var equipe = el('abaBlocoEquipe');
        if (minhas) {
            minhas.classList.toggle('is-active', ui.escopo === 'minhas');
            minhas.setAttribute('aria-selected', ui.escopo === 'minhas' ? 'true' : 'false');
        }
        if (equipe) {
            equipe.classList.toggle('is-active', ui.escopo === 'equipe');
            equipe.setAttribute('aria-selected', ui.escopo === 'equipe' ? 'true' : 'false');
        }
        var nova = el('btnNovaNotaBloco');
        if (nova) nova.disabled = !podeGravarEscopo(ident, ui.escopo);
        var drawer = el('blocoAnotacoesDrawer');
        if (drawer) drawer.classList.toggle('is-editando', !!editor);
        var filtros = el('blocoAnotacoesFiltros');
        if (filtros) filtros.innerHTML = renderizarFiltros(ui.filtro);
        aplicarStatus(ctrl.status(ui.escopo));
        atualizarBadge();
    }

    function renderCorpo(focar) {
        var corpo = el('blocoAnotacoesCorpo');
        if (!corpo) return;
        var ctrl = garantirControlador();
        var ident = ctrl.identidadeAtual();
        if (editor) {
            corpo.innerHTML = renderizarEditor(editor.rascunho);
            ligarEditor(!!focar);
            return;
        }
        corpo.innerHTML = renderizarLista(notasDaTela(), {
            escopo: ui.escopo,
            somenteLeitura: !podeGravarEscopo(ident, ui.escopo),
            confirmandoId: confirmandoId,
            mensagemVazia: mensagemVazia()
        });
    }

    function lerCamposEditor() {
        var titulo = el('blocoNotaTitulo');
        var conteudo = el('blocoNotaConteudo');
        return {
            titulo: titulo ? titulo.value : (editor && editor.rascunho ? editor.rascunho.titulo : ''),
            conteudo: conteudo ? conteudo.value : (editor && editor.rascunho ? editor.rascunho.conteudo : ''),
            etiqueta: editor && editor.rascunho ? editor.rascunho.etiqueta : 'Geral',
            fixada: !!(editor && editor.rascunho && editor.rascunho.fixada)
        };
    }

    function capturarRascunho() {
        if (!editor) return;
        var campos = lerCamposEditor();
        editor.rascunho.titulo = campos.titulo;
        editor.rascunho.conteudo = campos.conteudo;
        editor.rascunho.etiqueta = campos.etiqueta;
        editor.rascunho.fixada = campos.fixada;
        editor.rascunho.cor = etiquetaPorNome(campos.etiqueta).cor;
    }

    function ligarEditor(focar) {
        var titulo = el('blocoNotaTitulo');
        var conteudo = el('blocoNotaConteudo');
        if (titulo) titulo.addEventListener('input', agendarAutoSave);
        if (conteudo) conteudo.addEventListener('input', agendarAutoSave);
        if (titulo) {
            titulo.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    void salvarAgora(true);
                }
            });
        }
        var form = titulo && titulo.closest ? titulo.closest('form') : null;
        if (form) {
            form.addEventListener('submit', function (ev) {
                ev.preventDefault();
                void salvarAgora(true);
            });
        }
        if (focar && titulo && titulo.focus) titulo.focus();
    }

    function agendarAutoSave() {
        if (timerSalvar) clearTimeout(timerSalvar);
        timerSalvar = setTimeout(function () {
            timerSalvar = null;
            capturarRascunho();
            if (normalizarCampos(editor && editor.rascunho).vazio) return;
            void salvarAgora(false);
        }, AUTOSAVE_MS);
    }

    function cancelarTimerSalvar() {
        if (!timerSalvar) return;
        clearTimeout(timerSalvar);
        timerSalvar = null;
    }

    function avancarSessaoEditor() {
        editorSessionToken += 1;
        // Um salvamento ainda em voo precisa drenar o pedido explícito da nota seguinte.
        if (!salvandoAgora) resavePendente = null;
    }

    function copiarSnapshot(origem) {
        var base = origem || {};
        return {
            titulo: base.titulo || '',
            conteudo: base.conteudo || '',
            etiqueta: base.etiqueta || 'Geral',
            fixada: !!base.fixada,
            id: base.id || '',
            escopo: base.escopo || (editor && editor.escopo) || ui.escopo,
            persistido: !!base.persistido
        };
    }

    function snapshotEditorAtual() {
        capturarRascunho();
        return copiarSnapshot({
            titulo: editor && editor.rascunho ? editor.rascunho.titulo : '',
            conteudo: editor && editor.rascunho ? editor.rascunho.conteudo : '',
            etiqueta: editor && editor.rascunho ? editor.rascunho.etiqueta : 'Geral',
            fixada: editor && editor.rascunho ? editor.rascunho.fixada : false,
            id: editor ? editor.notaId : '',
            escopo: editor ? editor.escopo : ui.escopo,
            persistido: !!(editor && editor.persistido)
        });
    }

    function concluirResolvers(lista) {
        var fila = lista || [];
        var i;
        for (i = 0; i < fila.length; i++) {
            try { fila[i](); } catch (e) { /* a espera de quem chamou salvar não pode travar a fila */ }
        }
    }

    function enfileirarResave(token, fechar) {
        var resolver;
        var espera = new Promise(function (resolve) { resolver = resolve; });
        var campos = snapshotEditorAtual();
        if (resavePendente && resavePendente.token === token) {
            resavePendente.fechar = resavePendente.fechar || !!fechar;
            resavePendente.campos = campos;
            resavePendente.chave = editor ? editor.chave : '';
            resavePendente.resolvers.push(resolver);
            return espera;
        }
        resavePendente = {
            token: token,
            fechar: !!fechar,
            campos: campos,
            chave: editor ? editor.chave : '',
            resolvers: [resolver],
            anterior: resavePendente
        };
        return espera;
    }

    function desembrulharResave(item) {
        var lista = [];
        var atual = item;
        while (atual) {
            lista.push(atual);
            var proximo = atual.anterior;
            atual.anterior = null;
            atual = proximo;
        }
        lista.reverse();
        return lista;
    }

    function notaJaExiste(ctrl, escopo, id) {
        if (!ctrl || typeof ctrl.estado !== 'function' || !idValido(id)) return false;
        var notas = ctrl.estado(escopo).notas || [];
        var i;
        for (i = 0; i < notas.length; i++) {
            if (notas[i].id === id) return true;
        }
        return false;
    }

    async function persistirItemFila(item) {
        var token = item.token;
        var fecharEste = !!item.fechar;
        var camposAtuais = item.campos;
        var resolvers = item.resolvers ? item.resolvers.slice() : [];
        var ctrl = garantirControlador();
        try {
            while (camposAtuais) {
                var sessaoViva = !!(editor && editorSessionToken === token);
                var snap = copiarSnapshot(camposAtuais);
                if (sessaoViva && editor.persistido && editor.notaId) {
                    snap.id = editor.notaId;
                    snap.persistido = true;
                }
                var campos = {
                    titulo: snap.titulo,
                    conteudo: snap.conteudo,
                    etiqueta: snap.etiqueta,
                    fixada: !!snap.fixada,
                    id: snap.id
                };
                if (!idValido(campos.id)) {
                    campos.id = novoId(new Date().toISOString());
                    snap.id = campos.id;
                    if (sessaoViva) editor.notaId = campos.id;
                }
                if (normalizarCampos(campos).vazio) {
                    var validacao = el('blocoNotaValidacao');
                    if (validacao && sessaoViva) {
                        validacao.textContent = editor && editor.persistido ? '' : mensagemValidacao('vazia');
                    }
                    if (fecharEste && sessaoViva && editor && !editor.persistido) encerrarEditor();
                    break;
                }
                var escopoSalvar = snap.escopo || (sessaoViva && editor ? editor.escopo : ui.escopo);
                if (item.chave && ctrl.chaveAtual(escopoSalvar) !== item.chave) break;
                if (sessaoViva && editor.chave !== ctrl.chaveAtual(editor.escopo)) {
                    encerrarEditor();
                    break;
                }
                if (ctrl.identidadeAtual().identificado && sessaoViva) aplicarStatus('salvando');
                var notaIdParam = (snap.persistido || notaJaExiste(ctrl, escopoSalvar, campos.id)) && idValido(campos.id) ? campos.id : null;
                var res = null;
                try {
                    res = await ctrl.salvarCampos(escopoSalvar, notaIdParam, campos);
                } catch (e) {
                    break;
                }
                sessaoViva = !!(editor && editorSessionToken === token);
                if (res && res.motivo === 'usuario-trocado') {
                    if (sessaoViva) encerrarEditor();
                    break;
                }
                if (res && (res.motivo === 'vazia' || res.motivo === 'limite') && !(resavePendente && resavePendente.token === token)) {
                    var aviso = el('blocoNotaValidacao');
                    if (aviso && sessaoViva) aviso.textContent = mensagemValidacao(res.motivo);
                    break;
                }
                if (res && res.nota && sessaoViva) {
                    editor.notaId = res.nota.id;
                    editor.persistido = true;
                    editor.novo = false;
                }
                if (resavePendente && resavePendente.token === token) {
                    if (resavePendente.fechar) fecharEste = true;
                    camposAtuais = resavePendente.campos;
                    if (resavePendente.resolvers) resolvers = resolvers.concat(resavePendente.resolvers);
                    resavePendente = resavePendente.anterior || null;
                    continue;
                }
                if (sessaoViva) {
                    aplicarStatus(res && res.status);
                    atualizarBadge();
                }
                if (fecharEste && sessaoViva) encerrarEditor();
                break;
            }
        } finally {
            concluirResolvers(resolvers);
        }
    }

    async function executarCadeia(item) {
        salvandoAgora = true;
        var lista = desembrulharResave(item);
        try {
            var i;
            for (i = 0; i < lista.length; i++) {
                await persistirItemFila(lista[i]);
                if (resavePendente) {
                    var extra = desembrulharResave(resavePendente);
                    resavePendente = null;
                    var j;
                    for (j = 0; j < extra.length; j++) lista.push(extra[j]);
                }
            }
        } finally {
            var resto = resavePendente;
            resavePendente = null;
            salvandoAgora = false;
            if (resto) executarCadeia(resto).then(function () {}, function () {});
        }
    }

    function mensagemValidacao(motivo) {
        if (motivo === 'limite') return 'O bloco chegou ao limite de notas.';
        return 'Escreva um título ou um conteúdo para salvar.';
    }

    function encerrarEditor() {
        editor = null;
        confirmandoId = null;
        avancarSessaoEditor();
        renderChrome();
        renderCorpo(false);
    }

    async function salvarAgora(fechar) {
        if (!editor) return;
        var token = editorSessionToken;
        var ctrl = garantirControlador();
        if (editor.chave !== ctrl.chaveAtual(editor.escopo)) {
            encerrarEditor();
            return;
        }
        if (fechar) cancelarTimerSalvar();
        if (salvandoAgora) {
            if (!editor || editorSessionToken !== token) return;
            return enfileirarResave(token, fechar);
        }
        salvandoAgora = true;
        var fecharEste = !!fechar;
        var resolversMesmaSessao = [];
        try {
            while (editor && editorSessionToken === token) {
                var snap;
                if (resavePendente && resavePendente.token === token) {
                    snap = copiarSnapshot(resavePendente.campos);
                    if (resavePendente.fechar) fecharEste = true;
                    if (resavePendente.resolvers) resolversMesmaSessao = resolversMesmaSessao.concat(resavePendente.resolvers);
                    resavePendente = resavePendente.anterior || null;
                } else {
                    snap = snapshotEditorAtual();
                }
                if (editor && editor.persistido && editor.notaId) snap.id = editor.notaId;
                var campos = {
                    titulo: snap.titulo,
                    conteudo: snap.conteudo,
                    etiqueta: snap.etiqueta,
                    fixada: !!snap.fixada,
                    id: snap.id
                };
                if (!idValido(campos.id)) {
                    campos.id = novoId(new Date().toISOString());
                    if (editor && editorSessionToken === token) editor.notaId = campos.id;
                }
                if (normalizarCampos(campos).vazio) {
                    var validacao = el('blocoNotaValidacao');
                    if (validacao && editorSessionToken === token) {
                        validacao.textContent = editor && editor.persistido ? '' : mensagemValidacao('vazia');
                    }
                    if (fecharEste && editor && !editor.persistido && editorSessionToken === token) encerrarEditor();
                    return;
                }
                if (ctrl.identidadeAtual().identificado && editorSessionToken === token) aplicarStatus('salvando');
                var notaIdParam = editor && editor.persistido ? campos.id : null;
                var escopoSalvar = snap.escopo || (editor && editor.escopo) || ui.escopo;
                var res = await ctrl.salvarCampos(escopoSalvar, notaIdParam, campos);
                if (editorSessionToken !== token || !editor) return;
                if (res && res.motivo === 'usuario-trocado') {
                    encerrarEditor();
                    return;
                }
                if (res && (res.motivo === 'vazia' || res.motivo === 'limite') && !(resavePendente && resavePendente.token === token)) {
                    var aviso = el('blocoNotaValidacao');
                    if (aviso) aviso.textContent = mensagemValidacao(res.motivo);
                    return;
                }
                if (res && res.nota && editorSessionToken === token) {
                    editor.notaId = res.nota.id;
                    editor.persistido = true;
                    editor.novo = false;
                }
                if (resavePendente && resavePendente.token === token) {
                    if (resavePendente.fechar) fecharEste = true;
                    continue;
                }
                if (editorSessionToken === token) {
                    aplicarStatus(res && res.status);
                    atualizarBadge();
                }
                if (fecharEste && editor && editorSessionToken === token) encerrarEditor();
                return;
            }
        } finally {
            var pendente = resavePendente;
            resavePendente = null;
            salvandoAgora = false;
            concluirResolvers(resolversMesmaSessao);
            if (pendente) executarCadeia(pendente).then(function () {}, function () {});
        }
    }

    function abrirNova() {
        var ctrl = garantirControlador();
        if (!podeGravarEscopo(ctrl.identidadeAtual(), ui.escopo)) return;
        cancelarTimerSalvar();
        confirmandoId = null;
        avancarSessaoEditor();
        editor = {
            novo: true,
            persistido: false,
            notaId: novoId(new Date().toISOString()),
            chave: ctrl.chaveAtual(ui.escopo),
            escopo: ui.escopo,
            rascunho: { titulo: '', conteudo: '', etiqueta: 'Geral', cor: 'azul', fixada: false }
        };
        renderChrome();
        renderCorpo(true);
    }

    function abrirEdicao(id) {
        var ctrl = garantirControlador();
        if (!podeGravarEscopo(ctrl.identidadeAtual(), ui.escopo)) return;
        var nota = null;
        ctrl.estado(ui.escopo).notas.forEach(function (item) {
            if (item.id === id) nota = item;
        });
        if (!nota) return;
        cancelarTimerSalvar();
        confirmandoId = null;
        avancarSessaoEditor();
        editor = {
            novo: false,
            persistido: true,
            notaId: nota.id,
            chave: ctrl.chaveAtual(ui.escopo),
            escopo: ui.escopo,
            rascunho: {
                titulo: nota.titulo,
                conteudo: nota.conteudo,
                etiqueta: nota.etiqueta,
                cor: nota.cor,
                fixada: nota.fixada
            }
        };
        renderChrome();
        renderCorpo(true);
    }

    function voltarEdicao() {
        cancelarTimerSalvar();
        editor = null;
        avancarSessaoEditor();
        renderChrome();
        renderCorpo(false);
    }

    async function sincronizarEscopo(escopo, renderizar) {
        var ctrl = garantirControlador();
        var fotoEstado = await ctrl.hidratar(escopo);
        if (ui.escopo === escopo) aplicarStatus(fotoEstado.status);
        atualizarBadge();
        if (renderizar && aberto && !editor && ui.escopo === escopo) renderCorpo(false);
        return fotoEstado;
    }

    async function sincronizarAberto() {
        await sincronizarEscopo(ui.escopo, true);
        if (!aberto) return;
        var outro = ui.escopo === 'minhas' ? 'equipe' : 'minhas';
        var ident = garantirControlador().identidadeAtual();
        if (ident.identificado || outro === 'minhas') await sincronizarEscopo(outro, false);
    }

    function aplicarAberto(valor) {
        aberto = valor;
        var drawer = el('blocoAnotacoesDrawer');
        var backdrop = el('blocoAnotacoesBackdrop');
        var botao = el('btnBlocoAnotacoesTopo');
        if (drawer) {
            drawer.classList.toggle('is-open', valor);
            drawer.setAttribute('aria-hidden', valor ? 'false' : 'true');
            try { drawer.inert = !valor; } catch (e) { /* navegador sem inert */ }
        }
        if (backdrop) {
            backdrop.classList.toggle('is-open', valor);
            backdrop.setAttribute('aria-hidden', valor ? 'false' : 'true');
        }
        if (botao) {
            botao.setAttribute('aria-expanded', valor ? 'true' : 'false');
            botao.classList.toggle('is-open', valor);
        }
    }

    function fecharBlocoAnotacoesDrawer() {
        cancelarTimerSalvar();
        editor = null;
        confirmandoId = null;
        avancarSessaoEditor();
        aplicarAberto(false);
        var botao = el('btnBlocoAnotacoesTopo');
        if (botao && typeof botao.focus === 'function') botao.focus();
    }

    function abrirBlocoAnotacoesDrawer() {
        if (!garantirInterface()) return;
        if (aberto) return;
        try {
            if (typeof window.fecharCentralAlertasDropdown === 'function') window.fecharCentralAlertasDropdown();
        } catch (e) { /* o dropdown de alertas é opcional */ }
        garantirControlador().aoTrocarUsuario();
        aplicarAberto(true);
        renderChrome();
        renderCorpo(false);
        var drawer = el('blocoAnotacoesDrawer');
        if (drawer && typeof drawer.focus === 'function') drawer.focus();
        void sincronizarAberto();
    }

    function toggleBlocoAnotacoesDrawer() {
        if (aberto) fecharBlocoAnotacoesDrawer();
        else abrirBlocoAnotacoesDrawer();
    }

    async function aposTrocaUsuario() {
        cancelarTimerSalvar();
        editor = null;
        confirmandoId = null;
        avancarSessaoEditor();
        var ctrl = garantirControlador();
        ctrl.aoTrocarUsuario();
        chaveUi = ctrl.chaveAtual('minhas');
        if (!ctrl.identidadeAtual().identificado && aberto) {
            fecharBlocoAnotacoesDrawer();
        }
        await ctrl.hidratar('minhas');
        atualizarBadge();
        if (aberto) {
            renderChrome();
            renderCorpo(false);
        }
    }

    function onClick(ev) {
        var origem = ev && ev.target ? ev.target : null;
        if (origem && origem.nodeType !== 1) origem = origem.parentElement;
        var alvo = origem && origem.closest ? origem.closest('[data-action]') : null;
        if (!alvo || !el('blocoAnotacoesDrawer') || !el('blocoAnotacoesDrawer').contains(alvo)) return;
        var acao = alvo.getAttribute('data-action');
        var id = alvo.getAttribute('data-nota-id');
        if (acao === 'fechar') {
            fecharBlocoAnotacoesDrawer();
            return;
        }
        if (acao === 'aba') {
            var escopo = alvo.getAttribute('data-escopo');
            if (escopo !== 'minhas' && escopo !== 'equipe') return;
            cancelarTimerSalvar();
            editor = null;
            confirmandoId = null;
            avancarSessaoEditor();
            ui.escopo = escopo;
            renderChrome();
            renderCorpo(false);
            void sincronizarEscopo(escopo, true);
            return;
        }
        if (acao === 'nova') {
            abrirNova();
            return;
        }
        if (acao === 'filtro') {
            ui.filtro = alvo.getAttribute('data-filtro') || 'todas';
            renderChrome();
            if (!editor) renderCorpo(false);
            return;
        }
        if (acao === 'editar') {
            abrirEdicao(id);
            return;
        }
        if (acao === 'fixar') {
            void garantirControlador().alternarFixacao(ui.escopo, id).then(function (res) {
                aplicarStatus(res && res.status);
                atualizarBadge();
                if (!editor) renderCorpo(false);
            });
            return;
        }
        if (acao === 'excluir') {
            confirmandoId = id;
            renderCorpo(false);
            return;
        }
        if (acao === 'cancelar-excluir') {
            confirmandoId = null;
            renderCorpo(false);
            return;
        }
        if (acao === 'confirmar-excluir') {
            var idExclusao = id;
            confirmandoId = null;
            void garantirControlador().excluir(ui.escopo, idExclusao).then(function (res) {
                aplicarStatus(res && res.status);
                atualizarBadge();
                renderCorpo(false);
            });
            return;
        }
        if (acao === 'salvar') {
            ev.preventDefault();
            void salvarAgora(true);
            return;
        }
        if (acao === 'voltar') {
            voltarEdicao();
            return;
        }
        if (acao === 'etiqueta') {
            if (!editor) return;
            capturarRascunho();
            editor.rascunho.etiqueta = etiquetaPorNome(alvo.getAttribute('data-etiqueta')).nome;
            editor.rascunho.cor = etiquetaPorNome(editor.rascunho.etiqueta).cor;
            renderCorpo(false);
            agendarAutoSave();
            return;
        }
        if (acao === 'fixar-rascunho') {
            if (!editor) return;
            capturarRascunho();
            editor.rascunho.fixada = !editor.rascunho.fixada;
            renderCorpo(false);
            agendarAutoSave();
        }
    }

    function onKeydown(ev) {
        if (!aberto || !ev || ev.key !== 'Escape') return;
        ev.preventDefault();
        fecharBlocoAnotacoesDrawer();
    }

    function garantirInterface() {
        if (interfacePronta) return true;
        if (typeof document === 'undefined' || !document || typeof document.getElementById !== 'function') return false;
        var botao = el('btnBlocoAnotacoesTopo');
        var drawer = el('blocoAnotacoesDrawer');
        if (!botao || !drawer) return false;
        garantirControlador();
        chaveUi = controlador.chaveAtual('minhas');
        controlador.aoTrocarUsuario();
        botao.addEventListener('click', function (ev) {
            ev.preventDefault();
            toggleBlocoAnotacoesDrawer();
        });
        drawer.addEventListener('click', onClick);
        var backdrop = el('blocoAnotacoesBackdrop');
        if (backdrop) backdrop.addEventListener('click', fecharBlocoAnotacoesDrawer);
        document.addEventListener('keydown', onKeydown);
        var busca = el('blocoAnotacoesBusca');
        if (busca) {
            busca.addEventListener('input', function () {
                ui.busca = busca.value;
                if (!editor) renderCorpo(false);
            });
        }
        window.addEventListener('storage', function (ev) {
            if (!ev) return;
            if (ev.key === 'active_session') {
                void aposTrocaUsuario();
                return;
            }
            if (ev.key && String(ev.key).indexOf('bloco_notas_') === 0 && aberto) void sincronizarAberto();
        });
        window.addEventListener('focus', function () {
            if (controlador && controlador.chaveAtual('minhas') !== chaveUi) {
                void aposTrocaUsuario();
                return;
            }
            if (aberto) void sincronizarAberto();
        });
        timerUsuario = setInterval(function () {
            if (!controlador) return;
            var chave = controlador.chaveAtual('minhas');
            if (chave !== chaveUi) void aposTrocaUsuario();
        }, 1500);
        renderChrome();
        atualizarBadge();
        interfacePronta = true;
        return true;
    }

    window.BlocoAnotacoesCore = {
        VERSAO: 1,
        CHAVE_EQUIPE: CHAVE_EQUIPE,
        CHAVE_ANONIMO: CHAVE_ANONIMO,
        PREFIXO_USUARIO: PREFIXO_USUARIO,
        ETIQUETAS: ETIQUETAS,
        TEXTOS: TEXTOS,
        AUTOSAVE_MS: AUTOSAVE_MS,
        escaparHtml: escaparHtml,
        slugSeguro: slugSeguro,
        hashFnv1a: hashFnv1a,
        resolverIdentidade: resolverIdentidade,
        obterIdentidadeDoPainel: obterIdentidadeDoPainel,
        chaveArmazenamento: chaveArmazenamento,
        podeSincronizarNuvem: podeSincronizarNuvem,
        podeGravarEscopo: podeGravarEscopo,
        criarEstadoVazio: criarEstadoVazio,
        analisarValor: analisarValor,
        serializarValor: serializarValor,
        normalizarCampos: normalizarCampos,
        criarNota: criarNota,
        iniciarEdicao: iniciarEdicao,
        confirmarEdicao: confirmarEdicao,
        cancelarEdicao: cancelarEdicao,
        excluirNota: excluirNota,
        alternarFixacao: alternarFixacao,
        ordenarNotas: ordenarNotas,
        filtrarNotas: filtrarNotas,
        mesclarPayloads: mesclarPayloads,
        formatarDataHora: formatarDataHora,
        textoAuditoria: textoAuditoria,
        renderizarLista: renderizarLista,
        renderizarEditor: renderizarEditor,
        renderizarFiltros: renderizarFiltros,
        criarControlador: criarControlador,
        testesUi: {
            preparar: function (ctrl, escopo) {
                controlador = ctrl || null;
                interfacePronta = true;
                editor = null;
                confirmandoId = null;
                aberto = true;
                cancelarTimerSalvar();
                salvandoAgora = false;
                resavePendente = null;
                editorSessionToken = 0;
                ui.escopo = escopo === 'equipe' ? 'equipe' : 'minhas';
                ui.filtro = 'todas';
                ui.busca = '';
                chaveUi = ctrl && typeof ctrl.chaveAtual === 'function' ? ctrl.chaveAtual('minhas') : null;
            },
            definirRascunho: function (parcial) {
                if (!editor || !editor.rascunho || !parcial) return;
                if (parcial.titulo != null) editor.rascunho.titulo = parcial.titulo;
                if (parcial.conteudo != null) editor.rascunho.conteudo = parcial.conteudo;
                if (parcial.etiqueta != null) editor.rascunho.etiqueta = parcial.etiqueta;
                if (parcial.fixada != null) editor.rascunho.fixada = !!parcial.fixada;
            },
            lerEditor: function () {
                if (!editor || !editor.rascunho) return null;
                return {
                    notaId: editor.notaId,
                    titulo: editor.rascunho.titulo,
                    conteudo: editor.rascunho.conteudo,
                    etiqueta: editor.rascunho.etiqueta,
                    fixada: !!editor.rascunho.fixada,
                    token: editorSessionToken,
                    persistido: !!editor.persistido,
                    escopo: editor.escopo
                };
            },
            abrirNova: abrirNova,
            abrirEdicao: abrirEdicao,
            salvar: salvarAgora,
            agendarAutoSave: agendarAutoSave,
            token: function () { return editorSessionToken; }
        }
    };
    window.toggleBlocoAnotacoesDrawer = toggleBlocoAnotacoesDrawer;
    window.abrirBlocoAnotacoesDrawer = abrirBlocoAnotacoesDrawer;
    window.fecharBlocoAnotacoesDrawer = fecharBlocoAnotacoesDrawer;

    if (typeof document !== 'undefined' && document && typeof document.addEventListener === 'function') {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', garantirInterface);
        else garantirInterface();
    }
})();
