// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use serde::Deserialize;

#[derive(Deserialize)]
struct OllamaGenerateResponse {
    response: String,
}

async fn call_ollama(endpoint: &str, body: Option<serde_json::Value>) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("http://localhost:11434{}", endpoint);
    let request = client.post(&url).header("Content-Type", "application/json");
    let request = if let Some(b) = body {
        request.body(b.to_string())
    } else {
        request
    };
    match request.send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                Ok(resp.text().await.unwrap_or_default())
            } else {
                Err(format!("Error: {}", resp.status()))
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn list_ollama_models() -> Result<String, String> {
    let response = reqwest::get("http://localhost:11434/api/tags").await
        .map_err(|e| e.to_string())?;
    if response.status().is_success() {
        let text = response.text().await.map_err(|e| e.to_string())?;
        Ok(text)
    } else {
        Err("Failed to fetch models".to_string())
    }
}

#[tauri::command]
async fn pull_ollama_model(model: String) -> Result<String, String> {
    let body = serde_json::json!({ "name": model });
    call_ollama("/api/pull", Some(body)).await
}

#[tauri::command]
async fn generate_ollama_response(model: String, prompt: String) -> Result<String, String> {
    let body = serde_json::json!({ "model": model, "prompt": prompt, "stream": false });
    let response = call_ollama("/api/generate", Some(body)).await?;
    let parsed: Result<OllamaGenerateResponse, _> = serde_json::from_str(&response);
    match parsed {
        Ok(data) => Ok(data.response),
        Err(_) => Ok(response),
    }
}

#[tauri::command]
async fn create_ollama_modelfile(name: String, modelfile: String) -> Result<String, String> {
    let body = serde_json::json!({ "name": name, "modelfile": modelfile });
    call_ollama("/api/create", Some(body)).await
}

#[tauri::command]
async fn search_duckduckgo(query: String) -> Result<String, String> {
    println!("🔍 Searching DuckDuckGo for: {}", query);

    // Call the duck CLI tool installed via cargo
    let output = std::process::Command::new("duck")
        .args(&["--query", &query, "--limit", "5"])
        .output()
        .map_err(|e| format!("Failed to run duck command: {}", e))?;

    if output.status.success() {
        let result = String::from_utf8_lossy(&output.stdout);
        let trimmed = result.trim();
        println!("✅ DDG CLI response: {}", trimmed);

        // Try to parse the output and format for frontend
        // For now, just wrap in our expected structure
        let output = serde_json::json!({
            "AbstractText": trimmed.lines().next().unwrap_or("Search completed successfully"),
            "AbstractSource": "",
            "search_results": trimmed.lines().map(|line| serde_json::json!({
                "title": "",
                "url": line,
                "description": ""
            })).collect::<Vec<_>>()
        });

        Ok(output.to_string())
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        println!("❌ DDG CLI failed: {}", error_msg);
        Err(format!("Search failed: {}", error_msg))
    }
}



#[tauri::command]
async fn check_ollama_running() -> Result<bool, String> {
    let response = reqwest::get("http://localhost:11434/api/tags").await
        .map_err(|_| "Not running".to_string())?;
    Ok(response.status().is_success())
}

#[cfg(target_os = "windows")]
#[tauri::command]
async fn install_ollama() -> Result<String, String> {
    // Run winget install Ollama.Ollama --accept-source-agreements --silent --disable-interactivity
    std::process::Command::new("winget")
        .args(&["install", "Ollama.Ollama", "--accept-source-agreements", "--silent", "--disable-interactivity"])
        .output()
        .map_err(|e| format!("Failed to start installation: {}", e))?;

    // After install, try to start Ollama
    std::process::Command::new("ollama")
        .arg("serve")
        .spawn()
        .map_err(|e| format!("Failed to start Ollama: {}", e))?;

    Ok("Installation complete, Ollama started".to_string())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
async fn install_ollama() -> Result<String, String> {
    Err("Automatic installation only supported on Windows".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            list_ollama_models,
            pull_ollama_model,
            generate_ollama_response,
            create_ollama_modelfile,
            search_duckduckgo,
            check_ollama_running,
            install_ollama
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
