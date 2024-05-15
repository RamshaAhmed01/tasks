import { create } from "zustand";
import { Todo } from "../types";
import zukeeper from "zukeeper";
import Client from "../http/Client";
import useUserStore from "./userStore";
import toast from "react-hot-toast";

type TodosStore = {
  filterStatus: string;
  setFilterStatus: (filterStatus: string) => void;
  todoList: Todo[];
  addTodo: (todo: Todo) => void;
  updateTodo: (todo: Todo) => void;
  deleteTodo: (id: string) => void;
  setTodos: (todoList: Todo[]) => void;
  getInitialTodoList: () => void;
};

const client = new Client();

const useTodosStore = create<TodosStore>(
  zukeeper((set: any) => ({
    filterStatus: "all",
    setFilterStatus: (filterStatus: string) => set(() => ({ filterStatus })),
    todoList: [] as Todo[],
    getInitialTodoList: async () => {
      const userId = useUserStore.getState().user.sub ?? "";
      const response = await client.getTodoList(userId);
      const todoList = response.data.todoList;
      set(() => ({ todoList: response.data.todoList }));
      window.localStorage.setItem("todoList", JSON.stringify(todoList));
    },
    addTodo: async (todo: Todo) => {
      const userId = useUserStore.getState().user.sub ?? "";
      if (userId === "") {
        throw new Error("User id not found");
      }
      const todoList = window.localStorage.getItem("todoList");
      const todoListArr = JSON.parse(todoList ? todoList : "{}") as Todo[];
      const newTodoListArr = todoListArr ? [...todoListArr, todo] : [todo];

      set(() => ({
        todoList: newTodoListArr,
      }));

      window.localStorage.setItem("todoList", JSON.stringify(newTodoListArr));

      const response = await client.putTodoList(userId, newTodoListArr);

      if (response) {
        toast.success("Task Added Successfully");
      }
    },
    updateTodo: async (updatedTodo: Todo) => {
      const userId = useUserStore.getState().user.sub ?? "";
      if (userId === "") {
        throw new Error("User id not found");
      }
      const todoList = window.localStorage.getItem("todoList");
      if (todoList) {
        const todoListArr = JSON.parse(todoList);
        todoListArr.forEach((todo: Todo) => {
          if (todo.id === updatedTodo.id) {
            todo.status = updatedTodo.status;
            todo.title = updatedTodo.title;
          }
        });
        window.localStorage.setItem("todoList", JSON.stringify(todoListArr));
        set((state: any) => ({
          todoList: state.todoList.map((todo: Todo) => {
            return todo.id === updatedTodo.id ? updatedTodo : todo;
          }),
        }));
        const response = await client.putTodoList(userId, todoListArr);
        if (response) toast.success("Task Updated successfully");
      }
    },
    deleteTodo: async (id: string) => {
      const userId = useUserStore.getState().user.sub ?? "";
      if (userId === "") {
        throw new Error("User id not found");
      }
      const todoList = window.localStorage.getItem("todoList");
      if (todoList) {
        const todoListArr = JSON.parse(todoList);
        todoListArr.forEach((todo: Todo, index: number) => {
          if (todo.id === id) {
            todoListArr.splice(index, 1);
          }
        });
        window.localStorage.setItem("todoList", JSON.stringify(todoListArr));
        set((state: any) => ({
          todoList: state.todoList.filter((todo: Todo) => {
            return todo.id !== id;
          }),
        }));
        const response = await client.putTodoList(userId, todoListArr);
        if (response) toast.success("Todo Deleted Successfully");
      }
    },
    setTodos: (todoList: Todo[]) => {
      const userId = useUserStore.getState().user.sub ?? "";
      if (userId === "") {
        throw new Error("User id not found");
      }
      set(() => ({ todoList }));
      window.localStorage.setItem("todoList", JSON.stringify(todoList));
      client.putTodoList(userId, todoList);
      toast.success("Todo List Updated Successfully");
    },
  }))
);

declare global {
  interface Window {
    store: typeof useTodosStore;
  }
}

window.store = useTodosStore;

export default useTodosStore;
