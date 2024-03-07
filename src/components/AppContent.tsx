import { AnimatePresence, Reorder, motion } from "framer-motion";
import { useSelector } from "react-redux";
import styles from "../styles/modules/app.module.scss";
import TodoItem from "./TodoItem";
import { RootTodoState } from "../types";
import { useState } from "react";

const container = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};
const child = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

function AppContent() {
  const todoList = useSelector((state: RootTodoState) => state.todo.todoList);
  const filterStatus = useSelector(
    (state: RootTodoState) => state.todo.filterStatus
  );

  const sortedTodoList = [...todoList];
  sortedTodoList.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  const filteredTodoList = sortedTodoList.filter((item) => {
    if (filterStatus === "all") {
      return true;
    }
    return item.status === filterStatus;
  });

  const [items, setItems] = useState(filteredTodoList);

  return (
    <motion.div
      className={styles.content__wrapper}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence>
        <Reorder.Group axis="y" values={items} onReorder={setItems}>
          {items && items.length > 0 ? (
            items.map((item) => (
              <Reorder.Item key={item.id} value={item}>
                <TodoItem key={item.id} todo={item} />
              </Reorder.Item>
            ))
          ) : (
            <motion.p variants={child} className={styles.emptyText}>
              No Todos
            </motion.p>
          )}
        </Reorder.Group>
      </AnimatePresence>
    </motion.div>
  );
}

export default AppContent;
