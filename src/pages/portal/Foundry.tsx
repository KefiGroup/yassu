import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Rocket, Calendar, Clock, Users, Video, Plus, Send, Bell,
  MapPin, CalendarDays, ChevronLeft, ChevronRight, Check,
  ExternalLink, Loader2
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

interface FoundryEvent {
  id: number;
  title: string;
  description: string | null;
  eventType: string;
  startTime: string;
  endTime: string | null;
  timezone: string;
  zoomMeetingId: string | null;
  zoomJoinUrl: string | null;
  zoomPasscode: string | null;
  capacity: number | null;
  isPublic: boolean;
  createdBy: number;
  createdAt: string;
  rsvpCount?: number;
  userRsvp?: string | null;
}

const eventTypeLabels: Record<string, string> = {
  roadshow: "Roadshow",
  workshop: "Workshop",
  office_hours: "Office Hours",
  demo_day: "Demo Day",
  networking: "Networking",
  other: "Event",
};

const eventTypeColors: Record<string, string> = {
  roadshow: "bg-violet-500",
  workshop: "bg-blue-500",
  office_hours: "bg-green-500",
  demo_day: "bg-amber-500",
  networking: "bg-pink-500",
  other: "bg-gray-500",
};

export default function Foundry() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<FoundryEvent | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    eventType: "roadshow",
    startTime: "",
    endTime: "",
    timezone: "America/New_York",
    capacity: "",
    createZoomMeeting: true,
    manualZoomLink: "",
  });

  const { data: events = [], isLoading } = useQuery<FoundryEvent[]>({
    queryKey: ["/api/foundry/events"],
    queryFn: async () => {
      const res = await fetch("/api/foundry/events", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: zoomStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/foundry/zoom-status"],
    queryFn: async () => {
      const res = await fetch("/api/foundry/zoom-status", { credentials: "include" });
      if (!res.ok) return { configured: false };
      return res.json();
    },
  });

  const { data: isAdmin } = useQuery<boolean>({
    queryKey: ["/api/user/is-admin"],
    queryFn: async () => {
      const res = await fetch("/api/user/roles", { credentials: "include" });
      if (!res.ok) return false;
      const roles = await res.json();
      return roles.some((r: { role: string }) => r.role === "admin");
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: typeof newEvent) => {
      const res = await apiRequest("/api/foundry/events", {
        method: "POST",
        body: JSON.stringify({
          ...eventData,
          capacity: eventData.capacity ? parseInt(eventData.capacity) : null,
        }),
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/foundry/events"] });
      setCreateDialogOpen(false);
      setNewEvent({
        title: "",
        description: "",
        eventType: "roadshow",
        startTime: "",
        endTime: "",
        timezone: "America/New_York",
        capacity: "",
        createZoomMeeting: true,
        manualZoomLink: "",
      });
      toast({ title: "Event Created", description: "Your event has been created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create event.", variant: "destructive" });
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: number; status: string }) => {
      await apiRequest(`/api/foundry/events/${eventId}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/foundry/events"] });
      toast({ title: "RSVP Updated", description: "Your response has been recorded." });
    },
  });

  const sendInvitesMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest(`/api/foundry/events/${eventId}/send-invites`, {
        method: "POST",
      });
      return res;
    },
    onSuccess: (data: { sentCount: number }) => {
      toast({ 
        title: "Invites Sent", 
        description: `Email invites sent to ${data.sentCount} users.` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send invites.", variant: "destructive" });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest(`/api/foundry/events/${eventId}/send-reminder`, {
        method: "POST",
      });
      return res;
    },
    onSuccess: (data: { sentCount: number }) => {
      toast({ 
        title: "Reminders Sent", 
        description: `Reminders sent to ${data.sentCount} users who RSVPed 'Going'.` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send reminders.", variant: "destructive" });
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, day);
    });
  };

  const upcomingEvents = events.slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Yassu Foundry</h1>
            <p className="text-muted-foreground">Monthly roadshows, workshops, and networking events</p>
          </div>
        </div>
        
        {isAdmin && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-event">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>
                  Schedule a new Foundry event. A Zoom meeting can be created automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Monthly Roadshow - January"
                    data-testid="input-event-title"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Join us for our monthly startup showcase..."
                    data-testid="input-event-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="eventType">Event Type</Label>
                    <Select
                      value={newEvent.eventType}
                      onValueChange={(value) => setNewEvent({ ...newEvent, eventType: value })}
                    >
                      <SelectTrigger data-testid="select-event-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="roadshow">Roadshow</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="office_hours">Office Hours</SelectItem>
                        <SelectItem value="demo_day">Demo Day</SelectItem>
                        <SelectItem value="networking">Networking</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="capacity">Capacity (optional)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={newEvent.capacity}
                      onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })}
                      placeholder="100"
                      data-testid="input-event-capacity"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      data-testid="input-start-time"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      data-testid="input-end-time"
                    />
                  </div>
                </div>
                
                {zoomStatus?.configured ? (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Switch
                      id="createZoom"
                      checked={newEvent.createZoomMeeting}
                      onCheckedChange={(checked) => setNewEvent({ ...newEvent, createZoomMeeting: checked })}
                    />
                    <Label htmlFor="createZoom" className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-blue-500" />
                      Create Zoom meeting automatically
                    </Label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="manualZoomLink">Meeting Link (Zoom, Meet, etc.)</Label>
                    <Input
                      id="manualZoomLink"
                      value={newEvent.manualZoomLink}
                      onChange={(e) => setNewEvent({ ...newEvent, manualZoomLink: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      data-testid="input-zoom-link"
                    />
                    <p className="text-xs text-muted-foreground">
                      Zoom API not configured. Enter a meeting link manually.
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => createEventMutation.mutate(newEvent)}
                  disabled={!newEvent.title || !newEvent.startTime || createEventMutation.isPending}
                  data-testid="button-submit-event"
                >
                  {createEventMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Event"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming Events</TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Upcoming Events</h3>
                <p className="text-muted-foreground">
                  Check back soon for upcoming roadshows and workshops!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {events.map((event) => (
                <Card key={event.id} className="hover-elevate" data-testid={`card-event-${event.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="text-center min-w-[60px]">
                          <div className="text-3xl font-bold text-primary">
                            {format(new Date(event.startTime), "d")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(event.startTime), "MMM")}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${eventTypeColors[event.eventType]} text-white`}>
                              {eventTypeLabels[event.eventType]}
                            </Badge>
                            {event.zoomJoinUrl && (
                              <Badge variant="outline" className="gap-1">
                                <Video className="w-3 h-3" />
                                Zoom
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(event.startTime), "h:mm a")}
                              {event.endTime && ` - ${format(new Date(event.endTime), "h:mm a")}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {event.rsvpCount || 0} going
                              {event.capacity && ` / ${event.capacity}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {event.userRsvp === "going" ? (
                          <Button variant="outline" size="sm" className="gap-1" disabled>
                            <Check className="w-4 h-4 text-green-500" />
                            Going
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "going" })}
                            disabled={rsvpMutation.isPending}
                            data-testid={`button-rsvp-${event.id}`}
                          >
                            RSVP
                          </Button>
                        )}
                        {event.zoomJoinUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(event.zoomJoinUrl!, "_blank")}
                            data-testid={`button-join-${event.id}`}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Join
                          </Button>
                        )}
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendInvitesMutation.mutate(event.id)}
                              disabled={sendInvitesMutation.isPending}
                              data-testid={`button-send-invites-${event.id}`}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Send Invites
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendReminderMutation.mutate(event.id)}
                              disabled={sendReminderMutation.isPending}
                              data-testid={`button-send-reminder-${event.id}`}
                            >
                              <Bell className="w-4 h-4 mr-1" />
                              Send Reminder
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      onClick={() => setCreateDialogOpen(true)}
                      data-testid="button-create-event-calendar"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Event
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24" />
                ))}
                {daysInMonth.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`h-24 border rounded-lg p-1 ${
                        isToday ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? "text-primary" : ""}`}>
                        {format(day, "d")}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${eventTypeColors[event.eventType]} text-white cursor-pointer`}
                            onClick={() => setSelectedEvent(event)}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${eventTypeColors[selectedEvent.eventType]} text-white`}>
                  {eventTypeLabels[selectedEvent.eventType]}
                </Badge>
              </div>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
              <DialogDescription>
                {format(new Date(selectedEvent.startTime), "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedEvent.description && (
                <p className="text-muted-foreground">{selectedEvent.description}</p>
              )}
              <div className="flex gap-2">
                {selectedEvent.userRsvp === "going" ? (
                  <Button variant="outline" disabled className="gap-1">
                    <Check className="w-4 h-4 text-green-500" />
                    You're Going
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      rsvpMutation.mutate({ eventId: selectedEvent.id, status: "going" });
                      setSelectedEvent(null);
                    }}
                  >
                    RSVP - I'm Going
                  </Button>
                )}
                {selectedEvent.zoomJoinUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedEvent.zoomJoinUrl!, "_blank")}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Join Zoom
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
