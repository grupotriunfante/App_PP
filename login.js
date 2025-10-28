// =================================================================
// !!! IMPORTANTE: COLE A URL DA SUA API DO APPS SCRIPT AQUI !!!
const API_URL = "https://script.google.com/macros/s/AKfycbwBodD9gkfmLM3_nSP_MuZxKnDp0vNXDRV-yjeA7mJqIYybyhW2TOBxvkT5_gStrUM7Vw/exec";
// =================================================================


// Espera o HTML carregar antes de executar o script
document.addEventListener("DOMContentLoaded", () => {
    
    const loginForm = document.getElementById("login-form");
    const loginButton = document.getElementById("login-button");
    const messageArea = document.getElementById("message-area");

    // Adiciona um "escutador" para o evento de submit do formulário
    loginForm.addEventListener("submit", (event) => {
        // Previne o recarregamento da página (comportamento padrão do form)
        event.preventDefault(); 

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        // Validação simples
        if (!username || !password) {
            showMessage("Por favor, preencha usuário e senha.", "error");
            return;
        }

        // Desabilita o botão e mostra "carregando"
        setLoading(true);

        // 1. Monta o "payload" (carga de dados) que a API espera
        const payload = {
            action: "doLogin",
            data: {
                user: username,
                pass: password
            }
        };

        // 2. Chama a API usando fetch()
        fetch(API_URL, {
            method: "POST",
            mode: "cors", // Necessário para chamadas entre domínios (GitHub -> Google)
            cache: "no-cache",
            headers: {
                "Content-Type": "text/plain;charset=utf-8", // Apps Script prefere text/plain para doPost
            },
            body: JSON.stringify(payload), // Converte o objeto JSON em texto
            redirect: "follow" // Segue redirecionamentos do Apps Script
        })
        .then(response => response.json()) // Converte a resposta da API em JSON
        .then(data => {
            // 3. Processa a resposta da API
            setLoading(false); // Reabilita o botão

            if (data.success) {
                // SUCESSO!
                showMessage("Login realizado com sucesso! Redirecionando...", "loading");
                
                // Salva os dados do usuário no navegador para usar em outras páginas
                localStorage.setItem("userData", JSON.stringify(data.user));
                
                // Redireciona para o dashboard (que ainda vamos criar)
                // Usamos um pequeno atraso para o usuário ver a mensagem de sucesso
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 1500);

            } else {
                // ERRO (Usuário/senha inválido, usuário inativo, etc.)
                showMessage(data.error || "Erro desconhecido no login.", "error");
            }
        })
        .catch(error => {
            // 4. Processa erros de rede (API fora do ar, URL errada, sem internet)
            setLoading(false);
            console.error("Erro na chamada da API:", error);
            showMessage("Não foi possível conectar ao servidor. Verifique sua URL ou conexão.", "error");
        });
    });

    /**
     * Função para mostrar mensagens para o usuário
     * @param {string} message - O texto da mensagem
     * @param {string} type - 'error' ou 'loading'
     */
    function showMessage(message, type) {
        messageArea.textContent = message;
        messageArea.className = type; // Aplica a classe CSS (error ou loading)
    }

    /**
     * Função para travar/destravar o botão de login
     * @param {boolean} isLoading - True para travar, false para destravar
     */
    function setLoading(isLoading) {
        loginButton.disabled = isLoading;
        if (isLoading) {
            loginButton.textContent = "Entrando...";
        } else {
            loginButton.textContent = "Entrar";
        }
    }
});
