import React, { useState, useEffect } from "react";
import axios from "axios";

interface Message {
  id: number;
  sender_name: string;
  message: string;
  timestamp: string;
  highlight?: {
    sender_name?: string[];
    message?: string[];
  };
}

const API_URL = "http://localhost:5000";
const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sender, setSender] = useState("");
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<Message[]>(`${API_URL}/messages`);
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!sender || !text) {
      return alert("Please enter a name and message");
    }
    try {
      await axios.post(`${API_URL}/messages`, { sender_name: sender, message: text });
      setText("");
      // Refresh messages after sending a new one.
      fetchMessages();
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  const searchMessages = async () => {
    if (!query) return;
    try {
      setSearchLoading(true);
      const { data } = await axios.get(`${API_URL}/search`, { params: { query } });
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching messages", error);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto", textAlign: "center" }}>
      <h1>Chat System</h1>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Your Name"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <input
          type="text"
          placeholder="Write a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>

      <h3>Messages</h3>
      {loading ? (
        <p>Loading messages...</p>
      ) : (
        <ul>
          {messages.map((msg) => (
            <li key={msg.id}>
              <strong>{msg.sender_name}</strong>: {msg.message}{" "}
              <small>({new Date(msg.timestamp).toLocaleString()})</small>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: "1rem" }}>
        <input
          type="text"
          placeholder="Search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <button onClick={searchMessages}>Search</button>
      </div>

      {searchLoading && <p>Searching...</p>}
      {searchResults.length > 0 && (
        <>
          <h3>Search Results</h3>
          <ul>
            {searchResults.map((msg) => (
              <li key={msg.id}>
                <strong>
                  {msg.highlight?.sender_name ? (
                    <span dangerouslySetInnerHTML={{ __html: msg.highlight.sender_name[0] }} />
                  ) : (
                    msg.sender_name
                  )}
                </strong>
                :{" "}
                {msg.highlight?.message ? (
                  <span dangerouslySetInnerHTML={{ __html: msg.highlight.message[0] }} />
                ) : (
                  msg.message
                )}{" "}
                <small>({new Date(msg.timestamp).toLocaleString()})</small>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default App;
