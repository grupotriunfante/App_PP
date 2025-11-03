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

/**
 * Constrói o HTML do formulário de checklist dinamicamente.
 * VERSÃO 4: Separa OBS (só NC) de ANEXOS (C ou NC)
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

    // *** HTML ALTERADO ***
    itens.forEach(item => {
        formHTML += `
            <div class="checklist-item" id="item-${item.id}">
                <label>${item.descricao} (ID: ${item.id})</label>
                
                <div class="resposta-group">
                    <input type="radio" name="${item.id}" value="C" required> C
                    <input type="radio" name="${item.id}" value="NC"> NC
                    <input type="radio" name="${item.id}" value="NA"> NA
                </div>

                <div class="obs-campo" id="obs-campo-${item.id}" style="display:none;">
                    <textarea name="obs-${item.id}" placeholder="Observação obrigatória"></textarea>
                </div>

                <div class="anexo-campos" id="anexo-campos-${item.id}" style="display:none;">
                    ${ buildAnexoFields(item.id, item.anexoCampos) }
                </div>
            </div>
        `;
    });
    // *** FIM DA ALTERAÇÃO ***

    formHTML += `
            <button type="submit" id="submit-checklist">Enviar Auditoria</button>
        </form>
    `;

    mainContent.innerHTML = formHTML;
    addFormLogic(); // Adiciona os eventos (lógica) ao formulário
}

/**
 * Helper: Constrói os campos de input[type=file]
 */
function buildAnexoFields(itemID, anexoCampos) {
    let anexoHTML = "";
    
    if (anexoCampos) {
        const labels = anexoCampos.split(';');
        labels.forEach((label, index) => {
            anexoHTML += `
                <label class="anexo-label">${label}:</label>
                <input type="file" name="anexo-${itemID}-${index}" data-label="${label}" accept="image/*">
            `;
        });
    } else {
        anexoHTML += `
            <label class="anexo-label">Anexar evidência (Opcional):</label>
            <input type="file" name="anexo-${itemID}-0" data-label="Evidencia" accept="image/*">
        `;
    }
    return anexoHTML;
}

/**
 * Adiciona a lógica de JavaScript ao formulário (mostrar/esconder campos).
 * VERSÃO 4: Lógica de exibição atualizada
 */
function addFormLogic() {
    const form = document.getElementById("checklist-form");

    const radios = form.querySelectorAll('input[type="radio"]');
    
    // *** LÓGICA ALTERADA ***
    radios.forEach(radio => {
        radio.addEventListener("change", (event) => {
            const itemName = event.target.name; // Ex: "REC-01"
            const itemValue = event.target.value; // Ex: "C", "NC" ou "NA"
            
            // Pega os dois containers separados
            const obsCampo = document.getElementById(`obs-campo-${itemName}`);
            const anexoCampos = document.getElementById(`anexo-campos-${itemName}`);

            // Lógica da Observação: SÓ para NC
            if (itemValue === "NC") {
                obsCampo.style.display = "block";
            } else {
                obsCampo.style.display = "none";
            }
            
            // Lógica dos Anexos: para C ou NC
            if (itemValue === "C" || itemValue === "NC") {
                anexoCampos.style.display = "block";
            } else {
                anexoCampos.style.display = "none";
            }
        });
    });
    // *** FIM DA ALTERAÇÃO ***

    form.addEventListener("submit", handleSubmit);
}


/**
 * Função principal que lida com o ENVIO do formulário.
 * (O restante do código é igual, mas está aqui para o copy/paste funcionar)
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
            const obs = itemElement.querySelector('textarea').value;
            
            if (resposta === "NC" && !obs) {
                throw new Error(`O item ${radioName} está NC, mas a observação está vazia.`);
            }

            let anexos = [];
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
