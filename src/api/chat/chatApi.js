import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api";
import axios from "axios";

// ----------------------
// 1:1 채팅 목록 조회 API
// ----------------------
export const getIndividualChatChannels = async (workSpaceSeq) => {
  const memberSeq = localStorage.getItem("memberSeq");
  const token = localStorage.getItem("accessToken");

  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/chat-service/chat/channels/individual`,
    {
      params: { workSpaceSeq }, // 쿼리 파라미터로 전달됨 → ?workSpaceSeq=1
      headers: { 
        "Authorization": `Bearer ${token}`,
        "X-Member-Seq": memberSeq }, // HTTP 헤더로 전달됨
    }
  );
  return res.data; // ResponseDto<List<MyChatListResDto>>
};