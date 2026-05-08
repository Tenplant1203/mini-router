import { Link } from "../../lib/react/Link";

export function Homepage() {
  return (
    <div>
      <h2>Home</h2>
      <ul>
        <li>
          <Link to="/items/1">Item 1</Link>
        </li>
        <li>
          <Link to="/items/2">Item 2</Link>
        </li>
        <li>
          <Link to="/search">Search</Link>
        </li>
      </ul>
    </div>
  );
}
