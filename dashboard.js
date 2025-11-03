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
 * VERSÃO 3: Com campos de anexo personalizados
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
        formHTML += `
            <div class="checklist-item" id="item-${item.id}">
                <label>${item.descricao} (ID: ${item.id})</label>
                
                <div class="resposta-group">
                    <input type="radio" name="${item.id}" value="C" required> C
                    <input type="radio" name="${item.id}" value="NC"> NC
                    <input type="radio" name="${item.id}" value="NA"> NA
                </div>

                <div class="nc-campos" id="nc-campos-${item.id}" style="display:none;">
                    <textarea name="obs-${item.id}" placeholder="Observação obrigatória"></textarea>
                    
                    ${ buildAnexoFields(item.id, item.anexoCampos) }
                    
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

/**
 * Helper: Constrói os campos de input[type=file]
 */
function buildAnexoFields(itemID, anexoCampos) {
    let anexoHTML = "";
    
    // Se anexoCampos (ex: "Foto 1;Foto 2") foi definido na planilha...
    if (anexoCampos) {
        const labels = anexoCampos.split(';');
        labels.forEach((label, index) => {
            anexoHTML += `
                <label class="anexo-label">${label}:</label>
                <input type="file" name="anexo-${itemID}-${index}" data-label="${label}" accept="image/*">
            `;
        });
    } else {
        // Senão, mostra o campo genérico de evidência
        anexoHTML += `
            <label class="anexo-label">Anexar evidência (Opcional):</label>
            <input type="file" name="anexo-${itemID}-0" data-label="Evidencia" accept="image/*">
        `;
    }
    return anexoHTML;
}

/**
 * Adiciona a lógica de JavaScript ao formulário (mostrar/esconder campos NC).
 */
function addFormLogic() {
    const form = document.getElementById("checklist-form");

    const radios = form.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        radio.addEventListener("change", (event) => {
            const itemName = event.target.name;
            const itemValue = event.target.value;
            const ncCampos = document.getElementById(`nc-campos-${itemName}`);

            if (itemValue === "NC") {
                ncCampos.style.display = "block"; // Mostra os campos de Obs/Anexo
            } else {
                ncCampos.style.display = "none"; // Esconde
            }
        });
    });

    form.addEventListener("submit", handleSubmit);
}

/**
 * Função principal que lida com o ENVIO do formulário.
 * VERSÃO 3: Lida com múltiplos anexos
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

            // *** LÓGICA DE COLETA DE ANEXOS ALTERADA ***
            let anexos = [];
            const fileInputs = itemElement.querySelectorAll('input[type="file"]');
            
            fileInputs.forEach(fileInput => {
                const file = fileInput.files[0];
                const label = fileInput.getAttribute('data-label');

                if (file) {
                    // Adiciona a "promessa" de ler o arquivo na lista
                    fileReadPromises.push(
                        readFileAsBase64(file).then(base64String => {
                            anexos.push({ // Adiciona na lista de anexos
                                nome: file.name,
                                tipo: file.type,
                                dadosBase64: base64String,
                                label: label // Envia o label (ex: "Foto dos produtos")
                            });
                        })
                    );
                }
            });

            respostas.push({
                id: radioName,
                resposta: resposta,
                obs: obs,
                anexos: anexos // Envia a lista de anexos
            });
        }

        // --- 2. Espera todos os arquivos serem lidos ---
        await Promise.all(fileReadPromises);

        // --- 3. Monta o Payload final ---
        const payload = {
            action: "submitChecklist",
            data: {
                area: area,
                userLogin: currentUserData.Login,
                unidade: currentUserData.Unidade,
                respostas: respostas
            }
        };

        // --- 4. Envia para a API ---
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
            redirect: "follow"
        });

        const data = await response.json();

        // --- 5. Processa a Resposta ---
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

/**
 * Função utilitária para ler um arquivo e retornar uma Promise com o Base64.
 */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * Função para mostrar mensagens no formulário
 */
function showMessage(message, type, area = document.getElementById("form-message-area")) {
    if (!area) return;
    area.textContent = message;
    area.className = type; 
    
    // Adicione classes CSS para .success, .error, .loading no seu style.css
    // Ex: .error { color: red; } .success { color: green; }
}
