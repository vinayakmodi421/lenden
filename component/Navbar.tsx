import { useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import ForgetPassword from "./ForgetPassword";
import Login from "./Login";
import Register from "./Register";
import VerifyEmail from "./VerifyEmail";
import Chats from "../pages/Chats";
import Home from "../pages/Home";
import Notification from "../pages/Notification";
import Settings from "../pages/Settings";
import { apiFetch, debounce } from "../src/constants";
import { ExchangeIcon, SearchIcon } from "./icon";

const navigationItems = [
  { label: "Home", path: "/" },
  { label: "Chat", path: "/chat" },
  { label: "Notifications", path: "/notification" },
  { label: "Settings", path: "/settings" },
];

type SearchResult = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
};

function getUserDisplayName(user: SearchResult) {
  return user.name || user.username || "Unknown user";
}

export default function Navbar() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chats />} />
        <Route path="/chat/:groupId" element={<Chats />} />
        <Route path="/notification" element={<Notification />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forget-password" element={<ForgetPassword />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#354133]">
      <NavbarContent />
      <Outlet />
    </div>
  );
}

function NavbarContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const { pathname } = useLocation();

  const search = debounce(async (s: string) => {
    const query = s.trim();

    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await apiFetch(`/search?username=${encodeURIComponent(query)}`);
      if (!response.ok) {
        console.error("Search request failed", response.status);
        setSearchResults([]);
        return;
      }

      const data = await response.json();
      const resultList = data?.data || []
      setSearchResults(resultList);
    } catch (error) {
      console.error("Search API error:", error);
      setSearchResults([]);
    }
  }, 500);

  const handleInvite = (user: SearchResult) => {
    console.log("Invite user:", getUserDisplayName(user), user);
  };
  // console.log(searchQuery, searchResults)
  return (
    <header className="border-b border-[#DDE5D8] bg-white/95 shadow-sm backdrop-blur">
      <nav className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link
          aria-label="Lenden home"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#354133]"
          to="/"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7EEE3] text-[#63765E]">
            <ExchangeIcon />
          </span>
          <span>Lenden</span>
        </Link>

        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <form className="relative" role="search">
            <label className="sr-only" htmlFor="navbar-search">Search Lenden</label>
            <SearchIcon />
            <input
              className="h-10 w-full rounded-xl border border-[#DDE5D8] bg-[#F7F8F5] pl-10 pr-4 text-sm text-[#354133] outline-none transition placeholder:text-[#8A9785] focus:border-[#9CAF95] focus:bg-white focus:ring-2 focus:ring-[#E7EEE3]"
              id="navbar-search"
              onChange={(event) => {
                const value = event.target.value;
                setSearchQuery(value);
                search(value);
              }}
              placeholder="Search"
              type="search"
              value={searchQuery}
            />
          </form>

          {searchQuery && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-xl border border-[#DDE5D8] bg-white shadow-lg">
              {searchResults.length > 0 ? (
                searchResults.map((user, index) => {
                  const userId = user._id || user.id || `${getUserDisplayName(user)}-${index}`;
                  const displayName = getUserDisplayName(user);

                  return (
                    <div key={userId} className="flex items-center justify-between gap-3 border-b border-[#F0F2EC] px-3 py-2 last:border-b-0">
                      <span className="truncate text-sm font-medium text-[#354133]">{displayName}</span>
                      <button
                        className="rounded-lg bg-[#E7EEE3] px-2.5 py-1.5 text-xs font-semibold text-[#354133] transition hover:bg-[#DCE7D5]"
                        onClick={() => handleInvite(user)}
                        type="button"
                      >
                        Invite
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-sm text-[#71806D]">No users found</div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 overflow-x-auto">
          {navigationItems.map((item) => {
            const isActive = item.path === "/" ? pathname === "/" : pathname === item.path || pathname.startsWith(`${item.path}/`);

            return (
              <Link
                key={item.path}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-[#E7EEE3] text-[#4F624B]" : "text-[#71806D] hover:bg-[#F7F4ED] hover:text-[#354133]"}`}
                to={item.path}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

