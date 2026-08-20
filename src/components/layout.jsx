import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function Layout() {
  return (
    <div className="app-layout-container">
      <Sidebar />
      <div className="app-main-area">
        <Navbar />
        <main className="page-content-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;