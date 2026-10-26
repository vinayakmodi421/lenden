import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DetailsIcon, LogoutIcon, UserIcon } from "../component/icon";

type SettingsSection = "profile" | "personal";

export default function Settings() {
  const [section, setSection] = useState<SettingsSection>("profile");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-[#71806D]">Manage your account preferences.</p>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="flex flex-col rounded-2xl border border-[#DDE5D8] bg-white p-3 shadow-sm">
          <div className="space-y-1">
            <SidebarButton active={section === "profile"} label="Profile" onClick={() => setSection("profile")} icon={<UserIcon />} />
            <SidebarButton active={section === "personal"} label="Personal details" onClick={() => setSection("personal")} icon={<DetailsIcon />} />
          </div>

          <button className="mt-auto flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50" onClick={handleLogout} type="button">
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </aside>

        <section className="rounded-2xl border border-[#DDE5D8] bg-white p-6 shadow-sm sm:p-8">{section === "profile" ? <ProfileSection /> : <PersonalDetailsSection />}</section>
      </div>
    </main>
  );
}

function SidebarButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${active ? "bg-[#E7EEE3] text-[#4F624B]" : "text-[#71806D] hover:bg-[#F7F4ED] hover:text-[#354133]"}`} onClick={onClick} type="button">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ProfileSection() {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#354133]">Profile</h2>
      <p className="mt-1 text-sm text-[#71806D]">Your account overview.</p>
      <div className="mt-8 flex items-center gap-4 border-b border-[#DDE5D8] pb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E7EEE3] text-xl font-bold text-[#4F624B]">U</div>
        <div>
          <h3 className="font-bold text-[#354133]">Your profile</h3>
          <p className="mt-1 text-sm text-[#71806D]">Keep your account information up to date.</p>
        </div>
      </div>
    </div>
  );
}

function PersonalDetailsSection() {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#354133]">Personal details</h2>
      <p className="mt-1 text-sm text-[#71806D]">Update the details connected to your account.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Detail label="Full name" value="Not added yet" />
        <Detail label="Email address" value="Not added yet" />
        <Detail label="Phone number" value="Not added yet" />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#DDE5D8] bg-[#F7F4ED] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#71806D]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#52614F]">{value}</p>
    </div>
  );
}

