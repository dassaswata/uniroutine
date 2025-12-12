import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./components/home";
import Routines from "./components/routines";
import "./App.css";

function App() {
  return (
    <Router>
      <nav style={{ padding: '10px', background: '#eee' }}>
        <Link style={{ marginRight: '10px' }} to="/">Home</Link>
        <Link to="/routines">Routines</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/routines" element={<Routines />} />
      </Routes>
    </Router>
  );
}

export default App;