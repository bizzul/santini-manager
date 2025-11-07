"use client";
import React, { useEffect, useState } from "react";
//import TasksFilter from "../errorTracking/filterTasks";
import { useToast } from "../ui/use-toast";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

// Define types based on Supabase schema
interface Roles {
  id: number;
  name: string;
}

interface Task {
  id: number;
  unique_code?: string;
  client?: {
    businessName?: string;
  };
}

interface Session {
  user: {
    sub: string;
  };
}

const CheckboxGroup = ({
  options,
  selectedValues = [],
  onSelectionChange,
}: any) => {
  const handleCheckboxChange = (optionValue: string, isChecked: boolean) => {
    const newSelectedValues = isChecked
      ? [...selectedValues, optionValue]
      : selectedValues.filter((value: any) => value !== optionValue);
    onSelectionChange(newSelectedValues);
  };

  // const handleButtonClick = (option) => {
  //   if (selectedValues.includes(option.id)) {
  //     setSelectedValues(selectedValues.filter((id) => id !== option.id));
  //   } else {
  //     setSelectedValues([...selectedValues, option.id]);
  //   }
  // };

  return (
    <div className="flex flex-col">
      {options.map((option: any) => (
        <label key={option.id} className="md:truncate w-full">
          <input
            className="m-1"
            type="checkbox"
            value={option.id}
            checked={selectedValues.includes(option)}
            onChange={(event) =>
              handleCheckboxChange(option, event.target.checked)
            }
          />{" "}
          {option.name}
        </label>
      ))}
      {/* {options.map((option: any) => (
        <button
          key={option.id}
          className={`md:truncate w-full text-left ${
            selectedValues.includes(option.id) ? 'bg-blue-500 text-white' : 'bg-white text-black'
          }`}
          onClick={() => handleButtonClick(option)}
        >
          {option.name}
        </button>
      ))} */}
    </div>
  );
};

const CreatePage = ({
  data,
  session,
}: {
  data: { roles: Roles[]; tasks: Task[] };
  session: Session;
}) => {
  const rolesOptions = data.roles;
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [success, setSuccess] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const [rows, setRows] = useState([
    {
      task: "",
      start: "",
      end: "",
      hours: "",
      minutes: "",
      description: "",
      descriptionCat: "",
      roles: {},
      userId: session.user.sub,
    },
  ]);

  const [filteredRows, setFilteredRows] = useState(rows);

  useEffect(() => {
    setFilteredRows(rows.filter((row) => row.userId === session.user.sub));
  }, [rows, session.user.sub]);

  useEffect(() => {
    const updatedRows = [...rows];
    updatedRows[rows.length - 1].task = selectedTask?.unique_code || "";
    setRows(updatedRows);
  }, [selectedTask]);

  //assign roles to row
  useEffect(() => {
    const storedData = JSON.parse(
      //@ts-ignore
      localStorage.getItem(`timetracking-${session.user.sub}`)
    );
    if (storedData) {
      const updatedRows = storedData.map((row: any) => ({
        ...row,
        roles: row.roles,

        // task: row.task,
      }));

      setRows(updatedRows);
    }
  }, []);

  //save the data to localstorage
  const handleSaveData = async () => {
    try {
      const rowsToSave = [...rows];

      const lastRow = rowsToSave[rowsToSave.length - 1];

      // Only add a new row if the last row has some non-empty data
      if (
        (lastRow.task !== "" ||
          lastRow.start !== "" ||
          lastRow.end !== "" ||
          lastRow.hours !== "" ||
          lastRow.minutes !== "" ||
          lastRow.description !== "" ||
          lastRow.descriptionCat !== "" ||
          lastRow.roles) &&
        (lastRow.userId != null ||
          lastRow.userId !== "" ||
          (lastRow.userId !== undefined && rows.length >= 1))
      ) {
        rowsToSave.push({
          task: "",
          start: "",
          end: "",
          hours: "",
          minutes: "",
          description: "",
          descriptionCat: "",
          roles: {},
          userId: session.user.sub,
        });
      }

      // save the data to local storage
      localStorage.setItem(
        `timetracking-${session.user.sub}`,
        JSON.stringify(rowsToSave)
      );

      toast({
        description: `Dati temporanei salvati`,
      });
      // alert("Dati temporanei salvati");

      // alert("Dati temporanei salvati!");
    } catch (error) {
      alert(`An error occurred while saving data!, errore: ${error}`);
    }
  };

  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];

    // Check if the 'task' field in the last row is not empty
    if (lastRow.task === "") {
      toast({
        description:
          "Inserisci un numero di progetto prima di aggiungere una nuova riga!",
      });
      return;
    }

    // Check if roles is empty
    if (!lastRow.roles || Object.keys(lastRow.roles).length === 0) {
      toast({
        description: "Inserisci un reparto prima di aggiungere una nuova riga!",
      });
      return;
    }

    const newRow = {
      task: "",
      start: "",
      end: "",
      hours: "",
      minutes: "",
      description: "",
      descriptionCat: "",
      roles: {},
      userId: session.user.sub,
    };

    // Only add a new row if the last row has some non-empty data
    if (
      lastRow.task !== "" ||
      lastRow.start !== "" ||
      lastRow.end !== "" ||
      lastRow.hours !== "" ||
      lastRow.minutes !== "" ||
      lastRow.description !== "" ||
      lastRow.descriptionCat !== "" ||
      Object.keys(lastRow.roles).length > 0
    ) {
      handleSaveData();
      setRows([...rows, newRow]);
    }
    setSelectedTask(undefined);
  };

  //remove from localstorage
  const removeLocalStorage = async () => {
    if (window.confirm("Sei sicuro di svuotare tutto?")) {
      try {
        localStorage.removeItem(`timetracking-${session.user.sub}`);

        toast({
          description: `Registrazioni rimosse correttamente`,
        });
        location.reload();
      } catch (error) {
        alert("Errore!");
      }
    }
  };

  function handleSave() {
    setIsSaved(true);

    // Check if any element in the array has an empty 'task' field
    const hasEmptyTask = rows.some((row) => row.task === "");

    // Check if any element has missing roles
    const hasMissingRoles = rows.some((row) => {
      // Skip the last empty row
      if (row.task === "") return false;
      // Check if roles is empty object or undefined
      return !row.roles || Object.keys(row.roles).length === 0;
    });

    if (hasMissingRoles) {
      toast({
        description: "Devi selezionare un reparto per tutti i record!",
      });
      setIsSaved(false);
      return;
    }

    let rowsToSend = [
      {
        task: "",
        start: "",
        end: "",
        hours: "",
        minutes: "",
        description: "",
        descriptionCat: "",
        roles: {},
        userId: session.user.sub,
      },
    ];
    if (hasEmptyTask) {
      // Create a new array that only includes rows with a non-empty 'task' field
      rowsToSend = rows.filter((row) => row.task !== "");
    } else {
      rowsToSend = rows;
    }

    if (rowsToSend.length === 0) {
      console.error(
        "Cannot send request: no rows have a non-empty 'task' field"
      );
      toast({
        description: `Devi avere almeno un dato da inviare!`,
      });
      // alert("Devi avere almeno un dato da inviare!");
      setIsSaved(false);
      return;
    }

    // Calculate total hours from the rows
    const totalHours = rowsToSend.reduce((acc, row) => {
      const rowHours = parseInt(row.hours) || 0;
      const rowMinutes = parseInt(row.minutes) || 0;
      const totalRowMinutes = rowHours * 60 + rowMinutes;
      return acc + totalRowMinutes;
    }, 0);

    // Make a POST request to your protected API route
    fetch("/api/time-tracking/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rowsToSend), // Assuming the array is stored in a variable called 'rows'
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Network response was not ok");
        } else {
          return res.json();
        }
      })
      .then((data) => {
        if (data.error) {
          console.error("Error in saving data", data.error);
          alert("Errore nel salvataggio! Riprova.." + data.error);
          setIsSaved(false);
          return;
        }
        // console.log(data); // The response from your API
        setSuccess(true);
        const summedHours = {
          hours: Math.floor(totalHours / 60),
          minutes: totalHours % 60,
        };
        toast({
          description: `Ore registrate correttamente! Totale: ${summedHours.hours} ore ${summedHours.minutes} minuti`,
        });
        setTimeout(() => {
          setSuccess(false);
          localStorage.removeItem(`timetracking-${session.user.sub}`);
          location.reload();
        }, 5000);
      })
      .catch((error) => {
        console.error(
          "There was an error sending the data to the server:",
          error
        );

        alert("Errore nel salvataggio! Riprova..");
        setIsSaved(false);
      });
  }

  const handleInputChange = (event: any, index: number) => {
    const { name, value } = event.target;

    const updatedRows: any = [...rows];
    if (name !== "selection") {
      //updatedRows[index][name] = value;
      updatedRows[index][name] = value;
    }
    setRows(updatedRows);
  };

  const handleCheckboxChange = (index: any, values: any) => {
    const updatedRows = [...rows];
    updatedRows[index].roles = values;
    setRows(updatedRows);
  };

  const handleSelectChange = (e: string) => {
    // Assuming e is the task ID as a string
    console.log(e);
    const selectedTaskId = e;
    const selectedTask = data.tasks.find(
      (task) => task.id === Number(selectedTaskId)
    );
    setSelectedTask(selectedTask); // Assuming setSelectedTask is a function to update state
  };

  const handleSelectChangeRole = (e: any, index: number) => {
    const selectedRoleId = e;
    // Assuming data.roles is an array of role objects with 'id' and 'name' properties
    const selectedRole = data.roles.find(
      (role) => role.id === Number(selectedRoleId)
    );
    if (selectedRole) {
      const updatedRows = [...rows];
      updatedRows[index].roles = selectedRole; // Store the whole role object here
      setRows(updatedRows);
    }
  };

  const handleDeleteRow = (index: number) => {
    // update the state
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);

    // update the local storage
    localStorage.setItem(
      `timetracking-${session.user.sub}`,
      JSON.stringify(newRows)
    );
  };

  const calculateRemainingTime = (filterRows: any) => {
    let totalHours = 0;
    let totalMinutes = 0;

    filterRows.forEach((row: any) => {
      totalHours += Number(row.hours); // add hours to total
      totalMinutes += Number(row.minutes); // add minutes to total
    });

    // convert total minutes into hours and add to total hours
    totalHours += Math.floor(totalMinutes / 60);
    totalMinutes = totalMinutes % 60;

    // predefined hours and minutes for comparison
    let predefinedHours = 8;
    let predefinedMinutes = 30;

    // calculate remaining time
    let remainingHours = predefinedHours - totalHours;
    let remainingMinutes = predefinedMinutes - totalMinutes;

    // if remainingMinutes is negative, subtract one hour from remainingHours and add 60 to remainingMinutes
    if (remainingMinutes < 0) {
      remainingHours -= 1;
      remainingMinutes += 60;
    }

    // if remainingHours is negative, set both remainingHours and remainingMinutes to 0
    if (remainingHours < 0) {
      remainingHours = 0;
      remainingMinutes = 0;
    }

    return {
      total: {
        hours: totalHours,
        minutes: totalMinutes,
      },
      remaining: {
        hours: remainingHours,
        minutes: remainingMinutes,
      },
    };
  };

  // usage
  const { total, remaining } = calculateRemainingTime(filteredRows);

  return (
    <div className="flex justify-center w-auto min-h-screen flex-col items-center   gap-10 ">
      <h1 className="text-3xl pt-4 ">Registrazione ore</h1>

      {filteredRows.map((row, index) => (
        <div
          key={index}
          className="flex flex-row gap-4 border flex-wrap md:flex-nowrap justify-center items-center p-4  w-full  "
        >
          <div className="flex flex-col items-center w-1/2">
            <p className="font-bold">Selezionato</p> <p>{row.task}</p>
          </div>
          <div className="flex flex-col items-center w-1/2">
            {/* @ts-ignore */}
            {row.roles && row.roles.name ? (
              <>
                <p className="font-bold">Selezionato</p>
                <div className="mt-2 text-sm text-white font-bold">
                  {/* @ts-ignore */}
                  {row.roles.name}
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-gray-400">
                Nessun reparto selezionato
              </div>
            )}
          </div>
          {index === rows.length - 1 && ( // show only for the last row
            <div className="flex flex-col items-center w-1/2  ">
              <label>Progetto</label>
              <Select onValueChange={handleSelectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona progetto" />
                </SelectTrigger>
                <SelectContent>
                  {data.tasks.map((task, index) => (
                    <SelectItem value={task.id.toString()} key={task.id}>
                      {task.unique_code}
                      {/* @ts-ignore */}
                      {task.client?.businessName &&
                        //@ts-ignore
                        " - " + task.client?.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <input
            type="hidden"
            name="task"
            value={row.task}
            onChange={(event) => handleInputChange(event, index)}
          />

          {index === rows.length - 1 && (
            <div className="flex w-full flex-col items-center ">
              <label>Reparto/i</label>
              {/* <CheckboxGroup
              options={rolesOptions}
              selectedValues={row.roles}
              onSelectionChange={(values: any) =>
                handleCheckboxChange(index, values)
              }
            /> */}
              <Select onValueChange={(e) => handleSelectChangeRole(e, index)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona reparto" />
                </SelectTrigger>
                <SelectContent>
                  {rolesOptions.map((role, index) => (
                    <SelectItem value={role.id.toString()} key={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* <input
              type="hidden"
              name="roles"
              value={row.roles}
              onChange={(event) => handleInputChange(event, index)}
            /> */}
            </div>
          )}
          <div className="flex flex-row gap-1 ">
            <div className="flex flex-col items-center">
              <label>Ore</label>
              <Input
                type="number"
                className="bg-transparent  w-24"
                name="hours"
                value={row.hours}
                onChange={(event) => handleInputChange(event, index)}
              />
            </div>
            <div className="flex flex-col items-center ">
              <label>Minuti</label>
              <Input
                type="number"
                className="bg-transparent w-24"
                name="minutes"
                value={row.minutes}
                onChange={(event) => handleInputChange(event, index)}
              />
            </div>
            <div className="flex flex-col items-center ">
              <label>Commento</label>
              <Input
                type="text"
                className="bg-transparent  w-40"
                name="description"
                value={row.description}
                onChange={(event) => handleInputChange(event, index)}
              />
            </div>
            <div className="flex flex-col items-center">
              <label>Desc. Tipo</label>
              <select
                name="descriptionCat"
                value={row.descriptionCat}
                className="border rounded-xs  py-2 px-4"
                onChange={(event) => handleInputChange(event, index)}
              >
                <option value="">Nessuna</option>
                <option value="Logistica">Logistica</option>
                <option value="Speciale">Speciale</option>
                <option value="Errore">Errore</option>
              </select>
            </div>
          </div>
          {index != rows.length - 1 && (
            <button
              className="border bg-red-600/50 w-1/2 p-2 text-xs mt-3"
              onClick={() => handleDeleteRow(index)}
            >
              Cancella registrazione
            </button>
          )}
        </div>
      ))}
      <div>
        {" "}
        <h2 className="text-xl font-light -my-6">
          Ore registrate:{" "}
          <span className="font-bold">
            {total.hours}:{total.minutes}{" "}
          </span>
          / ore rimanenti:{" "}
          <span className="font-bold">
            {remaining.hours}:{remaining.minutes}
          </span>
        </h2>
      </div>
      <div className="flex flex-row gap-10">
        <button className="border w-full p-4" onClick={handleAddRow}>
          Aggiungi registrazione
        </button>
        <button
          className={`border bg-green-600 w-full p-4 opacity-100 transition-all duration-300 ${
            isSaved == true && "opacity-20 cursor-not-allowed"
          }}`}
          //@ts-ignore
          disabled={isSaved ? true : false}
          onClick={handleSave}
        >
          Salva a fine giornata
        </button>
        <button
          className="border bg-red-600 w-full p-4"
          onClick={removeLocalStorage}
        >
          Azzera
        </button>
      </div>
    </div>
  );
};

export default CreatePage;
