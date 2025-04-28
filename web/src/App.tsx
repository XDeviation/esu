import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Environments from "./components/Environments";
import Decks from "./components/Decks";
import MatchTypes from "./components/MatchTypes";
import MatchResults from "./components/MatchResults";
import "./App.css";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />}>
          <Route path="environments" element={<Environments />} />
          <Route path="decks" element={<Decks />} />
          <Route path="match-types" element={<MatchTypes />} />
          <Route path="match-results" element={<MatchResults />} />
          <Route index element={<Navigate to="environments" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
