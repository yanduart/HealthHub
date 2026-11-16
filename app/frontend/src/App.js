import { useEffect } from "react";

function App() {
  useEffect(() => {
    window.location.replace("/healthhub/index.html");
  }, []);

  return (
    <div style={{
      background: "#07090c",
      color: "#c6ff3b",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      letterSpacing: "3px",
    }}>
      Carregando HealthHub...
    </div>
  );
}

export default App;
