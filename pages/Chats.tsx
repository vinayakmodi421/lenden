import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch, getStoredAdminId } from "../src/constants";
import defaultGroupImage from "../src/assets/image.png";
import ChatBox, { type ChatGroupMembership } from "./ChatBox";


function parseTimestamp(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const time = Date.parse(dateStr);
  return Number.isNaN(time) ? 0 : time;
}

function getGroupId(membership: ChatGroupMembership) {
  return membership.groupId ?? membership.group?.id ?? membership.group?._id ?? membership.id;
}

async function fetchGroups(): Promise<ChatGroupMembership[]> {
  const id = getStoredAdminId();
  const response = await apiFetch(`/group/${id}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.message || result.error || "Could not fetch groups.");
  }
  const rawData = result.data;
  const rows: ChatGroupMembership[] = Array.isArray(rawData) ? rawData.flat(Infinity) : [];
  return rows;
}

export default function Chats() {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const focusMessageId = searchParams.get("message");
  const navigate = useNavigate();
  const { data: groups = [], isLoading, isError } = useQuery({
    queryKey: ["groups"],
    queryFn: fetchGroups,
  });

  const selectedMembership = groups.find(
    (membership) => String(getGroupId(membership)) === groupId
  );

  const sortedGroups = [...groups].sort((first, second) => {
    const firstTime = parseTimestamp(
      first.group?.updatedAt ?? first.updatedAt ?? first.group?.createdAt ?? first.createdAt
    );
    const secondTime = parseTimestamp(
      second.group?.updatedAt ?? second.updatedAt ?? second.group?.createdAt ?? second.createdAt
    );
    return secondTime - firstTime;
  });
  console.log(sortedGroups);
  return (
    <main>
      {isLoading && <p className="mt-2 text-[#71806D]">Loading groups...</p>}
      {isError && <p className="mt-2 text-red-600">Could not load groups.</p>}
      {selectedMembership && (
        <ChatBox
          fallbackImage={defaultGroupImage}
          focusMessageId={focusMessageId}
          membership={selectedMembership}
          onBack={() => navigate("/chat")}
        />
      )}
      {groupId && !isLoading && !isError && !selectedMembership && (
        <div className="mt-3">
          <p className="text-[#71806D]">Group not found.</p>
          <Link className="mt-2 inline-block font-semibold text-[#63765E] hover:underline" to="/chat">
            Back to groups
          </Link>
        </div>
      )}
      {!groupId && !isLoading && !isError && groups.length === 0 && (
        <p className="mt-2 text-[#71806D]">No groups yet.</p>
      )}
      {!groupId && groups.length > 0 && (
        <ul className="space-y-0">
          {sortedGroups.map((membership, i) => {
            const targetGroupId = getGroupId(membership);
            const latestMessage = membership.group?.lastMessage ?? membership.latestMsg;
            return (
              <li key={`${membership.id ?? targetGroupId ?? i}-${i}`}>
                <Link
                  className="block w-full rounded-xl border border-[#DDE5D8] p-1 text-left transition hover:border-[#9CAF95] hover:bg-white hover:shadow-sm"
                  to={`/chat/${encodeURIComponent(String(targetGroupId))}`}
                >
                  <div className="flex items-center gap-2">
                    <img
                      alt={`${membership.group?.name || "Group"} profile`}
                      className="h-12 w-12 rounded-full object-cover"
                      src={membership.group?.profilePic || defaultGroupImage}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-[#354133]">{membership.group?.name}</h2>
                      <p className="mt-0.5 truncate text-sm text-[#71806D]">
                        {latestMessage
                          ? latestMessage.msgUsername
                            ? `${latestMessage.msgUsername}: ${latestMessage.text}`
                            : latestMessage.text
                          : "No messages yet"}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
