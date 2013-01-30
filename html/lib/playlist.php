<?php
class Playlist {

	public $list;
	public $audio_dir;

	public function Playlist($options = array()) {
		$defaults = array(
			'audio_dir' => __DIR__
		);
		foreach ($defaults as $key => $value) {
			$this->$key = (isset($options[$key])) ? $options[$key] : $value;
		}
		$this->buildPlaylist();
	}

	private function buildPlaylist() {
		$this->list = array();
		$all_handle = opendir($this->audio_dir);
		while ($attitude = readdir($all_handle)) {
			if ($attitude == '.' || $attitude == '..') continue;
			$attitude_handle = opendir($this->audio_dir . '/' . $attitude);
			$this->list[$attitude] = array();
			while ($hour = readdir($attitude_handle)) {
				if ($hour == '.' || $hour == '..') continue;
				$hour_handle = opendir($this->audio_dir . '/' . $attitude . '/' . $hour);
				$this->list[$attitude][$hour] = array();
				while ($file = readdir($hour_handle)) {
					if ($file == '.' || $file == '..') continue;
					$this->list[$attitude][$hour][] = $file;
				}
				closedir($hour_handle);
			}
			closedir($attitude_handle);
			ksort($this->list[$attitude]);
		}
		closedir($all_handle);
	}

}
