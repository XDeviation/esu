import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { App as AntApp } from "antd";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Environments from "./components/Environments";
import Decks from "./components/Decks";
import MatchTypes from "./components/MatchTypes";
import MatchResults from "./components/MatchResults";
import Statistics from "./components/Statistics";
import DeckMatchups from "./components/DeckMatchups";
import WinRateTable from "./components/WinRateTable";
import "./App.css";

const App: React.FC = () => {
  return (
    <AntApp>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />}>
            <Route path="environments" element={<Environments />} />
            <Route path="decks" element={<Decks />} />
            <Route path="match-types" element={<MatchTypes />} />
            <Route path="match-results" element={<MatchResults />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="deck-matchups" element={<DeckMatchups />} />
            <Route path="win-rate-table" element={<WinRateTable />} />
            <Route index element={<Navigate to="environments" replace />} />
          </Route>
        </Routes>
      </Router>
    </AntApp>
  );
};

export default App;
