import WhiteboardPlanner from "../../../components/whiteboard-planner";

interface PlanPageProps {
  params: {
    token: string;
  };
}

export default function PlanPage({ params }: PlanPageProps) {
  return (
    <main className="h-screen w-full overflow-hidden">
      <WhiteboardPlanner token={params.token} />
    </main>
  );
}
