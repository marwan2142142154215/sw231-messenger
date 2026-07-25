import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ChatArea from '../components/ChatArea'

export default function ChatPage() {
  const { conversationId } = useParams()

  return (
    <div className="h-full flex">
      <Sidebar />
      <ChatArea />
    </div>
  )
}
