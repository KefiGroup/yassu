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
  ExternalLink, Loader2, Ticket, Lightbulb, Globe
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

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

// Format time in UTC for universal display
const formatTimeUTC = (dateString: string, formatStr: string = "h:mm a") => {
  return formatInTimeZone(new Date(dateString), "UTC", formatStr);
};

const formatDateUTC = (dateString: string, formatStr: string = "MMM d, yyyy") => {
  return formatInTimeZone(new Date(dateString), "UTC", formatStr);
};

const formatDateTimeUTC = (dateString: string) => {
  return formatInTimeZone(new Date(dateString), "UTC", "MMM d, yyyy h:mm a") + " UTC";
};

interface RoadshowBooking {
  id: number;
  ideaId: string;
  ideaTitle: string;
  eventId: number | null;
  eventTitle: string | null;
  eventStartTime: string | null;
  pitchDuration: number;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminNotes: string | null;
  createdAt: string;
}

interface UserIdea {
  id: string;
  title: string;
}

export default function Foundry() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<FoundryEvent | null>(null);

  const [bookingForm, setBookingForm] = useState({
    ideaId: "",
    selectedEventId: "",
    pitchDuration: "10",
    message: "",
  });

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

  // Filter for upcoming roadshow events that creators can book
  const upcomingRoadshows = events.filter(
    (e) => e.eventType === "roadshow" && new Date(e.startTime) > new Date()
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

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

  // Get user's ideas for booking
  const { data: userIdeas = [] } = useQuery<UserIdea[]>({
    queryKey: ["/api/my-ideas"],
    queryFn: async () => {
      const res = await fetch("/api/my-ideas", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Get user's roadshow bookings
  const { data: myBookings = [] } = useQuery<RoadshowBooking[]>({
    queryKey: ["/api/roadshow-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/roadshow-bookings", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: typeof bookingForm) => {
      const res = await apiRequest("/roadshow-bookings", {
        method: "POST",
        body: JSON.stringify({
          ideaId: data.ideaId,
          eventId: data.selectedEventId ? parseInt(data.selectedEventId) : null,
          pitchDuration: parseInt(data.pitchDuration),
          message: data.message || null,
        }),
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadshow-bookings"] });
      setBookingDialogOpen(false);
      setBookingForm({ ideaId: "", selectedEventId: "", pitchDuration: "10", message: "" });
      toast({ title: "Booking Requested", description: "Your roadshow request has been submitted for approval." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to submit booking request.", variant: "destructive" });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      await apiRequest(`/api/roadshow-bookings/${bookingId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadshow-bookings"] });
      toast({ title: "Booking Cancelled", description: "Your booking request has been cancelled." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel booking.", variant: "destructive" });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: typeof newEvent) => {
      console.log("Creating event with data:", eventData);
      const res = await apiRequest("/foundry/events", {
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
    onError: (error: any) => {
      console.error("Event creation error:", error);
      const message = error?.message || "Failed to create event.";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: number; status: string }) => {
      await apiRequest(`/foundry/events/${eventId}/rsvp`, {
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
      const res = await apiRequest(`/foundry/events/${eventId}/send-invites`, {
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
      const res = await apiRequest(`/foundry/events/${eventId}/send-reminder`, {
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Enter times in US Pacific Time (PT)</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Current PT: {new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time (Pacific)</Label>
                      <Input
                        id="startTime"
                        type="datetime-local"
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                        data-testid="input-start-time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time (Pacific)</Label>
                      <Input
                        id="endTime"
                        type="datetime-local"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                        data-testid="input-end-time"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Times entered in Pacific Time (PT) - users worldwide will see times in their local timezone
                  </p>
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
          <TabsTrigger value="book" data-testid="tab-book">
            <Ticket className="w-4 h-4 mr-1" />
            Book Roadshow
          </TabsTrigger>
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
                            {formatDateUTC(event.startTime, "d")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateUTC(event.startTime, "MMM")}
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
                              {formatTimeUTC(event.startTime)}
                              {event.endTime && ` - ${formatTimeUTC(event.endTime)}`}
                              <span className="text-xs">(UTC)</span>
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
                <div>
                  <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">All times shown in UTC</p>
                </div>
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

        <TabsContent value="book" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Request a Roadshow Slot
                </CardTitle>
                <CardDescription>
                  Present your startup idea at a monthly Yassu Foundry roadshow event.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userIdeas.length === 0 ? (
                  <div className="text-center py-8">
                    <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">You need to create an idea first before booking a roadshow slot.</p>
                    <Button className="mt-4" onClick={() => navigate("/portal/ideas")} data-testid="button-create-idea">
                      Create an Idea
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="booking-idea">Select Your Idea</Label>
                      <Select
                        value={bookingForm.ideaId}
                        onValueChange={(value) => setBookingForm({ ...bookingForm, ideaId: value })}
                      >
                        <SelectTrigger data-testid="select-booking-idea">
                          <SelectValue placeholder="Choose an idea to pitch" />
                        </SelectTrigger>
                        <SelectContent>
                          {userIdeas.map((idea) => (
                            <SelectItem key={idea.id} value={idea.id}>{idea.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="preferred-roadshow">Preferred Roadshow</Label>
                      {upcomingRoadshows.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No upcoming roadshows available. Check back later or contact an admin.
                        </p>
                      ) : (
                        <Select
                          value={bookingForm.selectedEventId}
                          onValueChange={(value) => setBookingForm({ ...bookingForm, selectedEventId: value })}
                        >
                          <SelectTrigger data-testid="select-preferred-roadshow">
                            <SelectValue placeholder="Select a roadshow date" />
                          </SelectTrigger>
                          <SelectContent>
                            {upcomingRoadshows.map((event) => (
                              <SelectItem key={event.id} value={String(event.id)}>
                                {event.title} - {formatDateTimeUTC(event.startTime)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="pitch-duration">Pitch Duration (minutes)</Label>
                      <Select
                        value={bookingForm.pitchDuration}
                        onValueChange={(value) => setBookingForm({ ...bookingForm, pitchDuration: value })}
                      >
                        <SelectTrigger data-testid="select-pitch-duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="20">20 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="booking-message">Additional Notes (Optional)</Label>
                      <Textarea
                        id="booking-message"
                        placeholder="Any special requirements or information for the organizers..."
                        value={bookingForm.message}
                        onChange={(e) => setBookingForm({ ...bookingForm, message: e.target.value })}
                        data-testid="textarea-booking-message"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createBookingMutation.mutate(bookingForm)}
                      disabled={!bookingForm.ideaId || createBookingMutation.isPending}
                      data-testid="button-submit-booking"
                    >
                      {createBookingMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                      ) : (
                        <><Ticket className="w-4 h-4 mr-2" /> Request Roadshow Slot</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Booking Requests</CardTitle>
                <CardDescription>Track the status of your roadshow booking requests.</CardDescription>
              </CardHeader>
              <CardContent>
                {myBookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No booking requests yet.</p>
                ) : (
                  <div className="space-y-3">
                    {myBookings.map((booking) => (
                      <div key={booking.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium">{booking.ideaTitle}</h4>
                            <p className="text-sm text-muted-foreground">
                              Requested: {new Date(booking.createdAt).toLocaleDateString()}
                            </p>
                            {booking.eventId && booking.eventTitle && (
                              <p className="text-sm text-muted-foreground">
                                Roadshow: {booking.eventTitle}
                                {booking.eventStartTime && ` - ${formatDateUTC(booking.eventStartTime)}`}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={
                              booking.status === 'approved' ? 'default' :
                              booking.status === 'pending' ? 'secondary' :
                              booking.status === 'rejected' ? 'destructive' : 'outline'
                            }
                          >
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>
                        {booking.adminNotes && (
                          <p className="text-sm mt-2 bg-muted p-2 rounded">{booking.adminNotes}</p>
                        )}
                        {booking.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => cancelBookingMutation.mutate(booking.id)}
                            disabled={cancelBookingMutation.isPending}
                            data-testid={`button-cancel-booking-${booking.id}`}
                          >
                            Cancel Request
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                {formatInTimeZone(new Date(selectedEvent.startTime), "UTC", "EEEE, MMMM d, yyyy 'at' h:mm a")} UTC
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
