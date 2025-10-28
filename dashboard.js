// =================================================================
// !!! COLE A URL DA SUA API DO APPS SCRIPT AQUI !!!
const API_URL = "https://script.google.com/macros/s/AKfycbwBodD9gkfmLM3_nSP_MuZxKnDp0vNXDRV-yjeA7mJqIYybyhW2TOBxvkT5_gStrUM7Vw/exec";
// =================================================================

// Variável global para armazenar os dados do usuário
let currentUserData = null;

/**
 * Função principal que é executada quando o DOM está pronto.
 */
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. VERIFICAÇÃO DE AUTENTICAÇÃO ---
    currentUserData = JSON.parse(localStorage.getItem("userData"));
    if (!currentUserData) {
        alert("Acesso negado. Por favor, faça o login.");
        window.location.href = "index.html"; 
        return;
    }

    // --- 2. INICIALIZA O DASHBOARD ---
    setupHeader();
    setupMenuListeners();
});

/**
 * Configura o cabeçalho com informações do usuário e botão Sair.
 */
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

/**
 * Adiciona os "escutadores" de clique aos links do menu.
 */
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

/**
 * Função para carregar o checklist da API.
 * @param {string} area - O nome da área (ex: "Recebimento")
 */
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
 * @param {string} area - O nome da área.
 * @param {Array} itens - A lista de itens vinda da API.
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
                    <input type="file" name="anexo-${item.id}" accept="image/*,.pdf">
                </div>
            </div>
        `;
    });

    formHTML += `
            <button type="submit" id="submit-checklist">Enviar Auditoria</button>
        </form>
    `;

    mainContent.innerHTML = formHTML;
    addFormLogic(); // Adiciona os eventos (lógica) ao formulário
}

/**
 * Adiciona a lógica de JavaScript ao formulário (mostrar/esconder campos NC).
 */
function addFormLogic() {
    const form = document.getElementById("checklist-form");

    // 1. Lógica para mostrar/esconder campos NC
    const radios = form.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        radio.addEventListener("change", (event) => {
            const itemName = event.target.name;
            const itemValue = event.target.value;
            const ncCampos = document.getElementById(`nc-campos-${itemName}`);
            
            if (itemValue === "NC") {
                ncCampos.style.display = "block";
            } else {
                ncCampos.style.display = "none";
            }
        });
    });

    // 2. Lógica de envio do formulário
    form.addEventListener("submit", handleSubmit); // Chama a nova função de envio
}

/**
 * Função principal que lida com o ENVIO do formulário.
 * Usamos 'async' para poder esperar (await) os arquivos de imagem carregarem.
 */
async function handleSubmit(event) {
    event.preventDefault(); // Impede o recarregamento da página
    
    const submitButton = document.getElementById("submit-checklist");
    const messageArea = document.getElementById("form-message-area");
    
    submitButton.disabled = true;
    submitButton.textContent = "Enviando... Por favor, aguarde.";
    showMessage("Processando dados...", "loading", messageArea);

    try {
        const area = document.getElementById("form-area").value;
        const itens = document.querySelectorAll(".checklist-item");
        
        let respostas = [];
        let fileReadPromises = []; // Lista de promessas de leitura de arquivo

        // --- 1. Validação e Coleta de Dados ---
        for (const itemElement of itens) {
            const radioName = itemElement.querySelector('input[type="radio"]').name;
            const checkedRadio = itemElement.querySelector('input[type="radio"]:checked');
            
            // Validação: Todos os itens devem ser respondidos
            if (!checkedRadio) {
                throw new Error(`O item ${radioName} não foi respondido.`);
            }
            
            const resposta = checkedRadio.value;
            const obs = itemElement.querySelector('textarea').value;
            const fileInput = itemElement.querySelector('input[type="file"]');
            const file = fileInput.files[0];

            // Validação: Se for NC, a observação é obrigatória
            if (resposta === "NC" && !obs) {
                throw new Error(`O item ${radioName} está NC, mas a observação está vazia.`);
            }

            let respostaItem = {
                id: radioName,
                resposta: resposta,
                obs: obs,
                anexo: null
            };

            // Se tiver um arquivo, prepara a leitura dele
            if (file && resposta === "NC") {
                // Adiciona a "promessa" de ler o arquivo na lista
                fileReadPromises.push(
                    readFileAsBase64(file).then(base64String => {
                        respostaItem.anexo = {
                            nome: file.name,
                            tipo: file.type,
                            dadosBase64: base64String
                        };
                    })
                );
            }
            respostas.push(respostaItem);
        }

        // --- 2. Espera todos os arquivos serem lidos ---
        // (Isso é rápido se não houver arquivos)
        await Promise.all(fileReadPromises);

        // --- 3. Monta o Payload final ---
        const payload = {
            action: "submitChecklist",
            data: {
                area: area,
                userLogin: currentUserData.Login, // "Login" veio da nossa planilha USUARIOS
                unidade: currentUserData.Unidade, // "Unidade" veio da nossa planilha
                respostas: respostas
            }
        };

        // --- 4. Envia para a API ---
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify(payload),
            redirect: "follow"
        });

        const data = await response.json();

        // --- 5. Processa a Resposta ---
        if (data.success) {
            showMessage("Auditoria enviada com sucesso!", "success", messageArea);
            // Recarrega o checklist em branco
            setTimeout(() => {
                loadChecklist(area); 
            }, 2000);
        } else {
            throw new Error(data.error || "Erro desconhecido da API.");
        }

    } catch (error) {
        // Pega qualquer erro (validação, rede, API)
        console.error("Erro ao enviar:", error);
        showMessage(error.message, "error", messageArea);
        submitButton.disabled = false;
        submitButton.textContent = "Tentar Enviar Novamente";
    }
}

/**
 * Função utilitária para ler um arquivo e retornar uma Promise com o Base64.
 * @param {File} file - O arquivo do input
 * @returns {Promise<string>} O string de dados em Base64
 */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            resolve(event.target.result); // Retorna o 'data:image/png;base64,....'
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsDataURL(file); // Inicia a leitura
    });
}

/**
 * Função para mostrar mensagens no formulário
 */
function showMessage(message, type, area = document.getElementById("form-message-area")) {
    if (!area) return;
    area.textContent = message;
    area.className = type; // Aplica a classe CSS (error, success, loading)
    
    // Adicione classes de estilo ao seu style.css se quiser cores
    // .error { color: red; }
    // .success { color: green; }
    // .loading { color: gray; }
}
