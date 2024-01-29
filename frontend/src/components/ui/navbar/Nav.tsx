"use client";
import React from "react";
import Link from "next/link";
import { useAppSelector, useAppDispatch } from "@/store/hook";
import { selectTheme } from "@/features/theme/themeSlice";
import { setDark, setLigth } from "@/features/theme/themeSlice";
import { SunIcon, MoonIcon } from "@/icons";
import Drawer from "../Drawer/Drawer";

function Nav() {
  const { dark, light } = useAppSelector(selectTheme);
  const dispatch = useAppDispatch();

  const changeThemeDark = () => {
    dispatch(setDark());
  };

  const changeThemeLight = () => {
    dispatch(setLigth());
  };

  return (
    <div className="navbar">
      <div className="navbar-start">
        <Link className="navbar-item" href={"/"}>
          Omegle Clone
        </Link>
      </div>
      <Drawer />
      <div className="md:navbar-end text-white hidden">
        <Link className="navbar-item" href={"/"}>
          {dark && <SunIcon click={changeThemeLight} />}
          {light && <MoonIcon click={changeThemeDark} />}
        </Link>
        <Link className="navbar-item" href={"/"}>
          Home
        </Link>
      </div>
    </div>
  );
}

export default Nav;
