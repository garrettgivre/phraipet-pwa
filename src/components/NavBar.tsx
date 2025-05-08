// src/components/NavBar.tsx
import { NavLink } from "react-router-dom";
import "./NavBar.css";

const NavBar = () => (
  <>
    <hr className="divider" />
    <nav className="nav">
      <NavLink to="/" end>Home</NavLink>
      <NavLink to="/explore">Explore</NavLink>
      <NavLink to="/play">Play</NavLink>
      <NavLink to="/pet">Pet</NavLink>
    </nav>
  </>
);

export default NavBar;
