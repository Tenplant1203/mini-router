import { useLoaderData, useNavigationState } from "../../lib/react/hooks";

type ItemData = {
  id: string;
  title: string;
  description: string;
};

export function ItemDetailPage() {
  const state = useNavigationState();
  const data = useLoaderData<ItemData>("item");

  if (state.status === "loading") {
    return <p>Loading item...</p>;
  }

  if (!data) {
    return <p>No item data.</p>;
  }

  return (
    <div>
      <h2>{data.title}</h2>
      <p>{data.description}</p>
    </div>
  );
}
