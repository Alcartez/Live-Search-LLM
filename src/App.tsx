import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import ReactMarkdown from 'react-markdown';
import "./App.css";

function App() {
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [chats, setChats] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [pullModel, setPullModel] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [customModelfile, setCustomModelfile] = useState("");
  const [ollamaRunning, setOllamaRunning] = useState<boolean | null>(null);

  const enableSearch = true; // Always enabled

  useEffect(() => {
    checkOllama();
  }, []);

  async function checkOllama() {
    try {
      const running = await invoke<boolean>("check_ollama_running");
      setOllamaRunning(running);
      if (running) loadModels();
    } catch (e) {
      setOllamaRunning(false);
    }
  }

  async function installOllama() {
    setLoading(true);
    try {
      const result = await invoke<string>("install_ollama");
      alert(result);
      setTimeout(() => checkOllama(), 2000);
    } catch (e) {
      alert("Installation failed: " + e);
    } finally {
      setLoading(false);
    }
  }

  async function browseModels() {
    await openUrl("https://ollama.com/library");
  }

  async function loadModels() {
    try {
      const res = await invoke<string>("list_ollama_models");
      const data = JSON.parse(res);
      setModels(data.models || []);
      if (data.models.length > 0 && !selectedModel) {
        setSelectedModel(data.models[0].name);
      } else if (data.models.length === 0) {
        // Auto pull default model
        setLoading(true);
        try {
          await invoke("pull_ollama_model", { model: "gemma3:1b" });
          await new Promise(res => setTimeout(res, 2000)); // Wait a bit for pull
          loadModels(); // Reload models
        } catch (e) {
          console.error("Failed to pull default model", e);
        } finally {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error("Failed to load models", e);
    }
  }

  async function pullModelAction() {
    if (!pullModel) return;
    setLoading(true);
    try {
      await invoke("pull_ollama_model", { model: pullModel });
      setPullModel("");
      loadModels();
    } catch (e) {
      alert("Failed to pull model");
    } finally {
      setLoading(false);
    }
  }

  async function createCustomModel() {
    if (!customModelName || !customModelfile) return;
    setLoading(true);
    try {
      await invoke("create_ollama_modelfile", { name: customModelName, modelfile: customModelfile });
      setCustomModelName("");
      setCustomModelfile("");
      loadModels();
    } catch (e) {
      alert("Failed to create model");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input || !selectedModel) return;
    setLoading(true);
    let prompt = input;
    const userContent = input;
    setInput("");

    // Immediately add user message and assistant placeholder
    setChats(prev => [
      ...prev,
      {role: "user" as const, content: userContent},
      {role: "assistant" as const, content: "..."}
    ]);

    const assistantIndex = chats.length + 1; // user takes +1, assistant takes +1

    if (enableSearch) {
      // Show searching status
      setChats(prev => {
        const newChats = [...prev];
        if (newChats[assistantIndex]) {
          newChats[assistantIndex].content = "*Searching live sources...*";
        }
        return newChats;
      });
      try {
        const ddg = await invoke<string>("search_duckduckgo", { query: userContent });
        const wiki = await invoke<string>("search_wikipedia", { query: userContent });
        const ddgData = JSON.parse(ddg);
        const wikiData = JSON.parse(wiki);
        const context = `DuckDuckGo: ${ddgData.AbstractText || ""}\nWikipedia: ${wikiData.extract || ""}`;
        prompt = `Based on this context:\n${context}\n\nAnswer: ${userContent}`;
        setChats(prev => {
          const newChats = [...prev];
          if (newChats[assistantIndex]) {
            newChats[assistantIndex].content = "*Context retrieved - thinking...*";
          }
          return newChats;
        });
      } catch (e) {
        console.error("Search failed", e);
        prompt += " (Search failed, proceeding without context)";
        setChats(prev => {
          const newChats = [...prev];
          if (newChats[assistantIndex]) {
            newChats[assistantIndex].content = "*Search failed - generating response locally...*";
          }
          return newChats;
        });
      }
    } else {
      setChats(prev => {
        const newChats = [...prev];
        if (newChats[assistantIndex]) {
          newChats[assistantIndex].content = "*Thinking...*";
        }
        return newChats;
      });
    }

    try {
      const response = await invoke<string>("generate_ollama_response", { model: selectedModel, prompt });
      setChats(prev => {
        const newChats = [...prev];
        if (newChats[assistantIndex]) {
          newChats[assistantIndex].content = response;
        }
        return newChats;
      });
    } catch (e) {
      setChats(prev => {
        const newChats = [...prev];
        if (newChats[assistantIndex]) {
          newChats[assistantIndex].content = "*Error generating response*";
        }
        return newChats;
      });
    } finally {
      setLoading(false);
    }
  }

  if (ollamaRunning === null) {
    return <div className="app"><h1>Checking Ollama...</h1></div>;
  }

  if (ollamaRunning === false) {
    return (
      <div className="app">
        <header>
          <h1>Live Search LLM</h1>
          <div>
            Ollama is not detected running on localhost:11434.
            <br />
            <button onClick={installOllama} disabled={loading}>Install Ollama</button>
            <button onClick={checkOllama}>Check Again</button>
            <button onClick={browseModels}>Browse Models</button>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>Live Search LLM</h1>
        <div className="model-selector">
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
            <option value="">Select Model</option>
            {models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>
          <input placeholder="Model to pull" value={pullModel} onChange={e => setPullModel(e.target.value)} />
          <button onClick={pullModelAction} disabled={loading}>Pull</button>
          <button onClick={browseModels}>Browse</button>
          <button onClick={() => setShowCustom(!showCustom)} disabled={loading}>
            {showCustom ? 'Hide' : 'Custom'}
          </button>
        </div>
        {showCustom && (
          <div className="custom-model">
            <input placeholder="Model Name" value={customModelName} onChange={e => setCustomModelName(e.target.value)} />
            <textarea placeholder="Modelfile" value={customModelfile} onChange={e => setCustomModelfile(e.target.value)} />
            <button onClick={createCustomModel} disabled={loading}>Create</button>
          </div>
        )}
      </header>
      <main className="chat-container">
        <div className="chat-history">
          {chats.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <strong>{msg.role}:</strong> {' '}
              {msg.content.startsWith('*') && msg.content.endsWith('*') ? (
                <span>{msg.content.slice(1, -1)} <div className="loader"></div></span>
              ) : (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              )}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <div>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything..."
              onKeyDown={e => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage} disabled={loading || !selectedModel}>Send</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
