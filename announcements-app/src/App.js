import React from 'react';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Announcements from './Announcements';
import '@aws-amplify/ui-react/styles.css';
import './App.css';

function App({ signOut, user }) {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <h1>Notification App</h1>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/announcements">Announcements</Link>
            <button onClick={signOut}>Sign Out</button>
          </div>
        </nav>

        <Routes>
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/" element={<Home user={user} />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home({ user }) {
  return (
    <div className="home">
      <h2>Welcome, {user.username}!</h2>
      <p>This is the Notification App. Navigate to the Announcements page to view the latest announcements.</p>
    </div>
  );
}

export default withAuthenticator(App);
