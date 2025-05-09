import { NavLink } from "react-router-dom";
import "./NavBar.css";

const NavBar = () => (
  <>
    <hr className="divider" />
    <nav className="nav">
      <NavLink to="/" end>Pet</NavLink>
      <NavLink to="/explore">Explore</NavLink>
      <NavLink to="/play">Play</NavLink>
    </nav>
  </>
);

export default NavBar;
