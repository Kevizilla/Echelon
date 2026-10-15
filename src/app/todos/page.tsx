import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function TodosPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from('todos').select();

  return (
    <div className="p-8 max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Supabase Todos Test</h1>
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-md">
          {error.message}
        </div>
      )}
      <ul className="space-y-1 text-sm list-disc pl-5">
        {todos && todos.length > 0 ? (
          todos.map((todo: { id: string | number; name: string }) => (
            <li key={todo.id}>{todo.name}</li>
          ))
        ) : (
          <li className="text-muted-foreground italic list-none">
            No todos found in your Supabase database table &quot;todos&quot;.
          </li>
        )}
      </ul>
    </div>
  );
}
