import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch, getStoredAdminId } from "../src/constants";
import { PlusIcon } from "../component/icon";

type Group = {
  name: string;
  profilePic: File | null;
  description: string;
  adminId: string;
};

const createGroup = async (group: Group) => {
  const formData = new FormData();
  formData.append("name", group.name.trim());
  formData.append("description", group.description.trim());
  formData.append("adminId", group.adminId);
  if (group.profilePic) {
    formData.append("profilePic", group.profilePic);
  } else {
    formData.append("profilePic", "");
  }

  const response = await apiFetch("/group", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || result.error || "Could not create the group.");
  }

  return result;
};


export default function Home() {
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupForm, setGroupForm] = useState<Group>({ name: "", profilePic: null, description: "", adminId: getStoredAdminId() });
  const [groupError, setGroupError] = useState("");


  const createGroupMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      setIsGroupDialogOpen(false);
      setGroupForm((currentGroup) => ({ ...currentGroup, name: "", profilePic: null, description: "" }));
      setGroupError("");
    },
    onError: (error) => {
      setGroupError(error instanceof Error ? error.message : "Could not create the group.");
    },
  });


  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGroupError("");
    await createGroupMutation.mutateAsync(groupForm).catch(() => undefined);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Home</h1>
          <p className="mt-2 text-[#71806D]">Welcome back to Lenden.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-[#63765E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#52614F] focus:outline-none focus:ring-4 focus:ring-[#C7D3C0]"
          onClick={() => setIsGroupDialogOpen(true)}
          type="button"
        >
          <PlusIcon />
          Add group
        </button>
      </div>

      {isGroupDialogOpen && (
        <div aria-labelledby="add-group-title" aria-modal="true" className="fixed inset-0 z-10 flex items-center justify-center bg-[#354133]/25 px-4" role="dialog">
          <form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onSubmit={handleCreateGroup}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#354133]" id="add-group-title">Add a group</h2>
                <p className="mt-1 text-sm text-[#71806D]">Create a space to organize shared expenses.</p>
              </div>
              <button aria-label="Close add group dialog" className="rounded-lg p-1 text-xl leading-none text-[#71806D] hover:bg-[#F7F4ED]" onClick={() => setIsGroupDialogOpen(false)} type="button">&times;</button>
            </div>
            <label className="mt-5 block text-sm font-semibold text-[#52614F]" htmlFor="group-name">Group name</label>
            <input autoFocus className="mt-2 h-11 w-full rounded-xl border border-[#DDE5D8] px-3 text-[#354133] outline-none focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]" id="group-name" onChange={(event) => setGroupForm((currentGroup) => ({ ...currentGroup, name: event.target.value }))} placeholder="e.g. Weekend trip" required value={groupForm.name} />
            <label className="mt-4 block text-sm font-semibold text-[#52614F]" htmlFor="group-profile-pic">Profile picture <span className="font-normal text-[#8A9785]">(optional)</span></label>
            <input accept="image/*" className="mt-2 block w-full rounded-xl border border-[#DDE5D8] bg-[#F7F8F5] p-2 text-sm text-[#71806D] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E7EEE3] file:px-3 file:py-1.5 file:font-semibold file:text-[#52614F]" id="group-profile-pic" onChange={(event) => setGroupForm((currentGroup) => ({ ...currentGroup, profilePic: event.target.files?.[0] ?? null }))} type="file" />
            <label className="mt-4 block text-sm font-semibold text-[#52614F]" htmlFor="group-description">Description <span className="font-normal text-[#8A9785]">(optional)</span></label>
            <textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[#DDE5D8] px-3 py-2.5 text-sm text-[#354133] outline-none focus:border-[#9CAF95] focus:ring-2 focus:ring-[#E7EEE3]" id="group-description" onChange={(event) => setGroupForm((currentGroup) => ({ ...currentGroup, description: event.target.value }))} placeholder="What is this group for?" value={groupForm.description} />
            {groupError && <p className="mt-3 text-sm text-red-600">{groupError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#63765E] hover:bg-[#F7F4ED]" onClick={() => setIsGroupDialogOpen(false)} type="button">Cancel</button>
              <button className="rounded-xl bg-[#63765E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#52614F] disabled:cursor-not-allowed disabled:opacity-60" disabled={createGroupMutation.isPending} type="submit">{createGroupMutation.isPending ? "Creating..." : "Create group"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

