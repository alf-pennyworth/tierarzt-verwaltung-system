
import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import VideoConsultationsList from "@/components/telemedizin/VideoConsultationsList";
import ChatList from "@/components/telemedizin/ChatList";
import ConsultationRoom from "@/components/telemedizin/ConsultationRoom";
import ScheduleConsultation from "@/components/telemedizin/ScheduleConsultation";
import { Calendar, MessageSquare, VideoIcon } from "lucide-react";

const Telemedizin = () => {
  const [activeTab, setActiveTab] = useState("consultations");
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  
  return (
    <div className="container p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Telemedizin</h1>
        <Button onClick={() => navigate("/telemedizin/schedule")}>
          <Calendar className="mr-2 h-4 w-4" />
          Konsultation planen
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Telemedizin-Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="consultations">
                <VideoIcon className="mr-2 h-4 w-4" />
                Video-Konsultationen
              </TabsTrigger>
              <TabsTrigger value="chats">
                <MessageSquare className="mr-2 h-4 w-4" />
                Nachrichten
              </TabsTrigger>
            </TabsList>
            <TabsContent value="consultations" className="pt-4">
              <VideoConsultationsList />
            </TabsContent>
            <TabsContent value="chats" className="pt-4">
              <ChatList />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const TelemedizinRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Telemedizin />} />
      <Route path="/schedule" element={<ScheduleConsultation />} />
      <Route path="/room/:id" element={<ConsultationRoom />} />
    </Routes>
  );
};

export default TelemedizinRoutes;
