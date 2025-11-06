// =================================================================
// !!! COLE A URL DA SUA API DO APPS SCRIPT AQUI !!!
const API_URL = "https://script.google.com/macros/s/AKfycbwBodD9gkfmLM3_nSP_MuZxKnDp0vNXDRV-yjeA7mJqIYybyhW2TOBxvkT5_gStrUM7Vw/exec";
// =================================================================

// Variável global para armazenar os dados do usuário
let currentUserData = null;

document.addEventListener("DOMContentLoaded", () => {
    currentUserData = JSON.parse(localStorage.getItem("userData"));
    if (!currentUserData) {
        alert("Acesso negado. Por favor, faça o login.");
        window.location.href = "index.html"; 
        return;
    }
    setupHeader();
    setupMenuListeners();
});

function setupHeader() {
    const userInfoDiv = document.getElementById("user-info");
    userInfoDiv.innerHTML = `
        <span>Olá, <strong>${currentUserData.NomeCompleto}</strong> (${currentUserData.Unidade})</span>
        <button id="logout-button">Sair</button>
    `;
    document.getElementById("logout-button").addEventListener("click", () => {
        localStorage.removeItem("userData");
        alert("Você saiu do sistema.");
        window.location.href = "index.html";
    });
}

function setupMenuListeners() {
    const menuLinks = document.querySelectorAll(".menu-link");
    menuLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const area = event.target.getAttribute("data-area");
            loadChecklist(area);
        });
    });
}

function loadChecklist(area) {
    const mainContent = document.getElementById("main-content");
    mainContent.innerHTML = `<h2>Carregando Checklist: ${area}...</h2>`;

    fetch(`${API_URL}?action=getChecklist&area=${area}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                buildChecklistForm(data.area, data.itens);
            } else {
                mainContent.innerHTML = `<p style="color:red;">Erro ao carregar checklist: ${data.error}</p>`;
            }
        })
        .catch(error => {
            console.error("Erro no fetch:", error);
            mainContent.innerHTML = `<p style="color:red;">Erro de conexão com a API.</p>`;
        });
}

// *** 1. FUNÇÃO MODIFICADA ***
// Totalmente reescrita para ser dinâmica
/**
 * Constrói o HTML do formulário de checklist dinamicamente.
 * VERSÃO 5: Totalmente dinâmica (Botões, Horários e Anexos)
 */
/**
 * Constrói o HTML do formulário de checklist dinamicamente.
 * VERSÃO 5.1: Corrige a lógica de exibição do container de anexo
 */
/**
 * Constrói o HTML do formulário de checklist dinamicamente.
 * VERSÃO 5.2: Corrige a lógica das regras 's' e 'se não'
 */
function buildChecklistForm(area, itens) {
    const mainContent = document.getElementById("main-content");
    
    if (itens.length === 0) {
        mainContent.innerHTML = `<h2>${area}</h2><p>Nenhum item de checklist cadastrado para esta área.</p>`;
        return;
    }

    let formHTML = `
        <h2>Auditoria: ${area}</h2>
        <form id="checklist-form">
            <input type="hidden" id="form-area" name="area" value="${area}">
            <div id="form-message-area"></div>
    `;

    itens.forEach(item => {
        
        // REQUISITO 2: Horário (Sem alteração)
        let htmlHorario = '';
        if (item.horaInicio) {
            htmlHorario = `<span class="horario-info">⏰ ${item.horaInicio} - ${item.horaFim}</span>`;
        }

        // --- LÓGICA DE ANEXOS CORRIGIDA (V5.2) ---
        let anexoDisplayStyle = 'display: none;'; // Padrão é escondido
        let anexoShowOnRule = ''; 
        let hasAnexoFields = !!item.anexoCampos;      // true se CamposAnexo estiver preenchido
        let rule = item.evidenciaObrigatoria;     // 's', 'se não', 'NC', etc.

        if (rule) {
            // CASO 1: Existe uma regra na coluna "Evidencia"
            if (rule === 's') {
                anexoShowOnRule = 'data-show-on="Sim"'; // CORRIGIDO: Mostrar se for "Sim"
            
            } else if (rule === 'se não') {
                // CORRIGIDO: Regra 'se não' depende do tipo de botão
                if (item.tipo === 'Sim/Não') {
                    anexoShowOnRule = 'data-show-on="Não"';
                } else {
                    anexoShowOnRule = 'data-show-on="NC"'; // Para C/NC/NA
                }
            
            } else {
                 // Outra regra (ex: você escreveu 'NC' direto na planilha)
                anexoShowOnRule = `data-show-on="${rule}"`;
            }

        } else if (hasAnexoFields) {
            // CASO 2: NÃO existe regra, mas existem campos (ex: EXP-001)
            anexoDisplayStyle = 'display: block;'; // Mostra sempre (Correto)
        }
        // CASO 3: Sem regra e sem campos -> Fica 'display: none' (Correto)
        // --- FIM DA CORREÇÃO ---


        // Lógica de Observação (sempre 'NC')
        let obsDisplayStyle = 'display: none;';
        let obsShowOnRule = 'data-show-on="NC"';


        formHTML += `
            <div class="checklist-item" id="item-${item.id}">
                <label>${item.ordem}. ${item.descricao}</label>
                ${htmlHorario}
                
                <div class="resposta-group botoes-resposta">
                    ${gerarBotoesResposta(item)}
                </div>

                <div class="obs-campo" id="obs-campo-${item.id}" style="${obsDisplayStyle}" ${obsShowOnRule}>
                    <textarea name="obs-${item.id}" placeholder="Observação (obrigatória para NC)"></textarea>
                </div>

                <div class="anexo-campos" id="anexo-campos-${item.id}" style="${anexoDisplayStyle}" ${anexoShowOnRule}>
                    ${ buildAnexoFields(item) }
                </div>
            </div>
        `;
    });

    formHTML += `
            <button type="submit" id="submit-checklist">Enviar Auditoria</button>
        </form>
    `;

    mainContent.innerHTML = formHTML;
    addFormLogic(); 
}

// *** 2. FUNÇÃO NOVA ***
// Helper para criar os botões (Req 1)
/**
 * Helper: Gera os botões C/NC/NA ou Sim/Não
 */
function gerarBotoesResposta(item) {
    const id = item.id;
    let botoesHtml = '';

    // item.tipo agora vem do Apps Script como "Sim/Não" ou "C/NC/NA"
    if (item.tipo === 'Sim/Não') {
        botoesHtml = `
            <input type="radio" name="${id}" id="resp-${id}-s" value="Sim" required>
            <label for="resp-${id}-s">Sim</label>
            <input type="radio" name="${id}" id="resp-${id}-n" value="Não">
            <label for="resp-${id}-n">Não</label>
        `;
    } else {
        // Padrão C/NC/NA
        botoesHtml = `
            <input type="radio" name="${id}" value="C" required>
            <label for="resp-${id}-c">C</label>
            <input type="radio" name="${id}" id="resp-${id}-nc" value="NC">
            <label for="resp-${id}-nc">NC</label>
            <input type="radio" name="${id}" id="resp-${id}-na" value="NA">
            <label for="resp-${id}-na">NA</label>
        `;
        // Corrigindo IDs dos labels que faltavam
        botoesHtml = botoesHtml.replace('value="C" required>', `value="C" id="resp-${id}-c" required>`);
    }
    return botoesHtml;
}


// *** 3. FUNÇÃO MODIFICADA ***
// Agora recebe o 'item' inteiro e não gera campos 'opcionais'
/**
 * Helper: Constrói os campos de input[type=file]
 */
/**
 * Helper: Constrói os campos de input[type=file]
 * VERSÃO 5.1: Corrige a lógica de conteúdo (Bug B)
 */
function buildAnexoFields(item) {
    let anexoHTML = "";
    
    if (item.anexoCampos) {
        // CASO 1: A planilha define os labels (ex: "Foto NF;Foto Produto")
        const labels = item.anexoCampos.split(';');
        labels.forEach((label, index) => {
            const trimmedLabel = label.trim();
            if (trimmedLabel) { 
                anexoHTML += `
                    <label class="anexo-label">${trimmedLabel}:</label>
                    <input type="file" name="anexo-${item.id}-${index}" data-label="${trimmedLabel}" accept="image/*" capture="environment">
                `;
            }
        });
    } else if (item.evidenciaObrigatoria) {
        // CASO 2: A planilha NÃO define labels, mas EXIGE evidência (ex: CF-001, RD-006)
        // Criamos um campo genérico
        anexoHTML += `
            <label class="anexo-label">Anexar Evidência:</label>
            <input type="file" name="anexo-${item.id}-0" data-label="Evidencia" accept="image/*" capture="environment">
        `;
    }
    // CASO 3: Sem anexoCampos e sem evidenciaObrigatoria -> retorna "" (correto)
    return anexoHTML;
}


// *** 4. FUNÇÃO MODIFICADA ***
// Lógica de exibição agora é genérica e baseada em 'data-show-on'
/**
 * Adiciona a lógica de JavaScript ao formulário (mostrar/esconder campos).
 * VERSÃO 5: Lógica de exibição genérica
 */
function addFormLogic() {
    const form = document.getElementById("checklist-form");
    if (!form) return;

    const radios = form.querySelectorAll('input[type="radio"]');
    
    radios.forEach(radio => {
        radio.addEventListener("change", (event) => {
            const itemValue = event.target.value; // Ex: "C", "NC", "Não"
            
            // Acha o "item-pai" (o card) onde o botão foi clicado
            const itemElement = event.target.closest('.checklist-item');
            if (!itemElement) return;

            // Encontra TODOS os campos condicionais dentro deste item
            // (Tanto o .obs-campo quanto o .anexo-campos)
            const conditionalFields = itemElement.querySelectorAll('[data-show-on]');

            conditionalFields.forEach(field => {
                // Pega a regra (ex: "NC" ou "Não")
                const regra = field.getAttribute('data-show-on');
                
                if (itemValue === regra) {
                    field.style.display = 'block'; // Mostra
                } else {
                    field.style.display = 'none'; // Esconde
                }
            });
        });
    });
    // *** FIM DA ALTERAÇÃO ***

    form.addEventListener("submit", handleSubmit);
}


/**
 * Função principal que lida com o ENVIO do formulário.
 * (NENHUMA ALTERAÇÃO NECESSÁRIA AQUI. JÁ É ROBUSTA.)
 */
async function handleSubmit(event) {
    event.preventDefault();
    
    const submitButton = document.getElementById("submit-checklist");
    const messageArea = document.getElementById("form-message-area");
    
    submitButton.disabled = true;
    submitButton.textContent = "Enviando... Por favor, aguarde.";
    showMessage("Processando dados...", "loading", messageArea);

    try {
        const area = document.getElementById("form-area").value;
        const itens = document.querySelectorAll(".checklist-item");
        
        let respostas = [];
        let fileReadPromises = [];

        for (const itemElement of itens) {
            const radioName = itemElement.querySelector('input[type="radio"]').name;
            const checkedRadio = itemElement.querySelector('input[type="radio"]:checked');
            
            if (!checkedRadio) {
                throw new Error(`O item ${radioName} não foi respondido.`);
            }
            
            const resposta = checkedRadio.value;
            const obsTextarea = itemElement.querySelector('textarea');
            const obs = obsTextarea ? obsTextarea.value : "";
            
            if (resposta === "NC" && !obs) {
                throw new Error(`O item ${radioName} está NC, mas a observação está vazia.`);
            }

            let anexos = [];
            // Coleta anexos apenas se o container de anexos estiver visível
            const anexoContainer = itemElement.querySelector('.anexo-campos');
            if (anexoContainer && anexoContainer.style.display === 'block') {
                const fileInputs = itemElement.querySelectorAll('input[type="file"]');
                
                fileInputs.forEach(fileInput => {
                    const file = fileInput.files[0];
                    const label = fileInput.getAttribute('data-label');

                    if (file) {
                        fileReadPromises.push(
                            readFileAsBase64(file).then(base64String => {
                                anexos.push({
                                    nome: file.name,
                                    tipo: file.type,
                                    dadosBase64: base64String,
                                    label: label
                                });
                            })
                        );
                    }
                });
            }

            respostas.push({
                id: radioName,
                resposta: resposta,
                obs: obs,
                anexos: anexos
            });
        }

        await Promise.all(fileReadPromises);

        const payload = {
            action: "submitChecklist",
            data: {
                area: area,
                userLogin: currentUserData.Login,
                unidade: currentUserData.Unidade,
                respostas: respostas
            }
        };

        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
            redirect: "follow"
        });

        const data = await response.json();

        if (data.success) {
            showMessage("Auditoria enviada com sucesso!", "success", messageArea);
            setTimeout(() => { loadChecklist(area); }, 2000);
        } else {
            throw new Error(data.error || "Erro desconhecido da API.");
        }

    } catch (error) {
        console.error("Erro ao enviar:", error);
        showMessage(error.message, "error", messageArea);
        submitButton.disabled = false;
        submitButton.textContent = "Tentar Enviar Novamente";
    }
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

function showMessage(message, type, area = document.getElementById("form-message-area")) {
    if (!area) return;
    area.textContent = message;
    area.className = type;
}
