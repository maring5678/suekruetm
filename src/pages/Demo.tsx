import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, BarChart3, MessageCircle, Award, TrendingUp, Users, Calendar, Star } from "lucide-react";
import { LiveChat } from "@/components/chat/LiveChat";
import { useState } from "react";

const DemoPage = () => {
  const [chatVisible, setChatVisible] = useState(false);
  const [currentTab, setCurrentTab] = useState("overview");

  // Demo-Daten für Charts
  const demoChartData = [
    { round: "R1", points: 25, position: 2 },
    { round: "R2", points: 30, position: 1 },
    { round: "R3", points: 20, position: 3 },
    { round: "R4", points: 35, position: 1 }
  ];

  const positionData = [
    { name: "1. Platz", value: 2, color: "hsl(var(--tournament-gold))" },
    { name: "2. Platz", value: 1, color: "hsl(var(--tournament-silver))" },
    { name: "3. Platz", value: 1, color: "hsl(var(--tournament-bronze))" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-6">
      {/* Theme Toggle - rechts oben */}
      <div className="fixed top-4 right-4 z-40">
        <ThemeToggle />
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-lg border-2 border-primary/20">
          <CardHeader className="text-center bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              🎮 Neue Features Demo
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Hier finden Sie alle neuen Funktionen - Charts, Dark/Light Mode, Achievements & Live Chat!
            </p>
          </CardHeader>
        </Card>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-lg">Charts & Analytics</h3>
              <p className="text-sm text-muted-foreground">Punkteverlauf, Positionsverteilung & mehr</p>
              <Badge className="mt-2">Neu!</Badge>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 text-center">
              <Award className="h-12 w-12 text-tournament-gold mx-auto mb-4" />
              <h3 className="font-bold text-lg">Achievements</h3>
              <p className="text-sm text-muted-foreground">Freischaltbare Erfolge & Fortschritte</p>
              <Badge className="mt-2">Neu!</Badge>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-bold text-lg">Live Chat</h3>
              <p className="text-sm text-muted-foreground">Echtzeit-Chat mit anderen Spielern</p>
              <Badge className="mt-2">Neu!</Badge>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 text-center">
              <div className="relative h-12 w-12 mx-auto mb-4">
                <div className="h-6 w-6 bg-primary rounded-full" />
                <div className="h-6 w-6 bg-secondary rounded-full absolute top-3 left-3" />
              </div>
              <h3 className="font-bold text-lg">Dark/Light Mode</h3>
              <p className="text-sm text-muted-foreground">Theme-Umschalter rechts oben</p>
              <Badge className="mt-2">Neu!</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Wie finde ich die Features? */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Wo finde ich die neuen Features?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-gradient-to-r from-primary/5 to-transparent">
                <h4 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Charts & Statistiken
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Wo:</strong> Starten Sie ein Turnier → Leaderboard → Tab "Analytics"<br/>
                  <strong>Oder:</strong> Statistiken → Klicken Sie auf einen Spieler → Tab "Charts"
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gradient-to-r from-tournament-gold/10 to-transparent">
                <h4 className="font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-tournament-gold" />
                  Achievements
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Wo:</strong> Statistiken → Klicken Sie auf einen Spieler → Tab "Achievements"
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-gradient-to-r from-accent/10 to-transparent">
                <h4 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-accent" />
                  Live Chat
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Wo:</strong> Erscheint automatisch rechts unten, wenn Sie ein Turnier starten oder sich in einem laufenden Turnier befinden
                </p>
                <Button 
                  onClick={() => setChatVisible(!chatVisible)}
                  size="sm"
                  className="mt-2"
                >
                  Chat Demo {chatVisible ? "ausblenden" : "anzeigen"}
                </Button>
              </div>

              <div className="border rounded-lg p-4 bg-gradient-to-r from-secondary/10 to-transparent">
                <h4 className="font-semibold flex items-center gap-2">
                  <div className="h-4 w-4 bg-primary rounded-full" />
                  Dark/Light Mode
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Wo:</strong> Rechts oben in der Ecke - klicken Sie auf das Mond/Sonne Symbol
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Tabs für die neuen Features */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>🎯 Live Demo der neuen Features</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Übersicht</TabsTrigger>
                <TabsTrigger value="charts">Charts</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">1,250</div>
                    <div className="text-sm text-muted-foreground">Gesamtpunkte</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-secondary">15</div>
                    <div className="text-sm text-muted-foreground">Turniere</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-accent">48</div>
                    <div className="text-sm text-muted-foreground">Runden</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-warning">26.0</div>
                    <div className="text-sm text-muted-foreground">⌀ Punkte</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="charts" className="space-y-4">
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                  <BarChart3 className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Interactive Charts</h3>
                  <p className="text-muted-foreground mb-4">
                    Hier sehen Sie normalerweise:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="border rounded p-3">
                      <strong>📈 Punkteverlauf</strong><br/>
                      <small>LineChart zeigt Punkte über Zeit</small>
                    </div>
                    <div className="border rounded p-3">
                      <strong>🥧 Positionsverteilung</strong><br/>
                      <small>PieChart zeigt 1./2./3. Plätze</small>
                    </div>
                    <div className="border rounded p-3">
                      <strong>📊 Turnierperformance</strong><br/>
                      <small>BarChart zeigt beste Turniere</small>
                    </div>
                    <div className="border rounded p-3">
                      <strong>📈 Kumulative Entwicklung</strong><br/>
                      <small>AreaChart zeigt Fortschritt</small>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="achievements" className="space-y-4">
                <div className="space-y-3">
                  {[
                    { title: "Erster Sieg", desc: "Gewinne deine erste Runde", unlocked: true, rarity: "Häufig" },
                    { title: "Champion", desc: "Gewinne 5 Runden", unlocked: true, rarity: "Selten" },
                    { title: "Legende", desc: "Gewinne 15 Runden", unlocked: false, rarity: "Legendär", progress: { current: 7, max: 15 } }
                  ].map((achievement, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Trophy className={`h-5 w-5 ${achievement.unlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="flex-grow">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{achievement.title}</h4>
                          <Badge variant={achievement.rarity === "Legendär" ? "default" : "secondary"}>
                            {achievement.rarity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{achievement.desc}</p>
                        {achievement.progress && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>{achievement.progress.current} / {achievement.progress.max}</span>
                              <span>{Math.round((achievement.progress.current / achievement.progress.max) * 100)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${(achievement.progress.current / achievement.progress.max) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <Badge variant={achievement.unlocked ? "default" : "outline"}>
                        {achievement.unlocked ? "✓" : "⏳"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Quick Start Anleitung */}
        <Card className="shadow-lg border-2 border-accent/20">
          <CardHeader className="bg-gradient-to-r from-accent/10 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              🚀 Schnellstart - So sehen Sie alle Features:
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-primary">Für Charts & Analytics:</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Turnier starten (mindestens 1 Runde spielen)</li>
                  <li>2. Im Leaderboard → Tab "Analytics"</li>
                  <li>3. Oder: Statistiken → Spieler anklicken → Tab "Charts"</li>
                </ol>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-tournament-gold">Für Achievements & Chat:</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Statistiken → Spieler anklicken → Tab "Achievements"</li>
                  <li>2. Chat erscheint bei laufendem Turnier rechts unten</li>
                  <li>3. Theme Toggle: Rechts oben (Mond/Sonne Symbol)</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demo Chat */}
      {chatVisible && (
        <LiveChat 
          roomId="demo-room"
          userName="Demo-User"
          isMinimized={false}
          onToggleMinimize={() => setChatVisible(false)}
        />
      )}
    </div>
  );
};

export default DemoPage;