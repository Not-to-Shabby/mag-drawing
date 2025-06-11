import WhiteboardPlanner from "../../../components/whiteboard-planner";

interface PlanPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function PlanPage({ params }: PlanPageProps) {
  const { token } = await params;
  
  return (
    <main className="h-screen w-full overflow-hidden">
      <WhiteboardPlanner token={token} />
    </main>
  );
}
